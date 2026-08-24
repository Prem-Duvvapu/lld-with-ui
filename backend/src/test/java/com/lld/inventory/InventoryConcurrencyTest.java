package com.lld.inventory;

import com.lld.inventory.exception.InsufficientStockException;
import com.lld.inventory.model.Category;
import com.lld.inventory.model.Product;
import com.lld.inventory.observer.InAppStockAlertObserver;
import com.lld.inventory.observer.LoggingStockAlertObserver;
import com.lld.inventory.observer.StockAlertNotifier;
import com.lld.inventory.repository.InventoryRepository;
import com.lld.inventory.service.InventoryService;
import com.lld.inventory.strategy.EoqReorderStrategy;
import com.lld.inventory.strategy.MinRestockStrategy;
import com.lld.inventory.strategy.ReorderStrategyFactory;
import com.lld.inventory.strategy.UrgentBufferReorderStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race in {@link InventoryService#doUpdateStock}: two threads selling
 * the last unit of the same product must never both succeed, and stock must never go negative.
 *
 * <p>This is the same per-entity-lock shape as uber's {@code DriverAssignmentService} — a single
 * flag-like invariant ("is there still stock?") rather than a set to re-scan — but the crossing
 * detection (LOW_STOCK / OUT_OF_STOCK alerts) that runs inside the same lock is unique to this
 * module: a naive fix could get the stock arithmetic right while still double-firing or missing
 * an alert if the crossing check reads state from outside the lock. These tests only assert the
 * stock invariant directly; the crossing-detection correctness is exercised in
 * {@link InventoryServiceTest}.
 */
@DisplayName("Inventory Concurrency — per-product stock lock")
class InventoryConcurrencyTest {

    private InventoryService newService() {
        InventoryRepository repo = new InventoryRepository();
        InAppStockAlertObserver inApp = new InAppStockAlertObserver();
        StockAlertNotifier notifier = new StockAlertNotifier(List.of(inApp, new LoggingStockAlertObserver()));
        ReorderStrategyFactory factory = new ReorderStrategyFactory(
                new MinRestockStrategy(), new EoqReorderStrategy(), new UrgentBufferReorderStrategy());
        return new InventoryService(repo, notifier, inApp, factory);
    }

    private long addProduct(InventoryService service, int stock) {
        Product saved = service.addProduct(Product.builder()
                .sku("RACE-" + stock + "-" + System.nanoTime())
                .name("Race Product")
                .category(Category.ELECTRONICS)
                .unitPrice(100.0)
                .currentStock(stock)
                .reorderLevel(5)
                .supplierId(1)
                .build());
        return saved.getId();
    }

    @Test
    @DisplayName("N buyers racing for the last unit: exactly one wins")
    void lastUnitRace_onlyOneWins() throws InterruptedException {
        InventoryService service = newService();
        long productId = addProduct(service, 1);

        int buyers = 10;
        ExecutorService pool = Executors.newFixedThreadPool(buyers);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(buyers);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < buyers; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.updateStock(productId, 1, "OUTBOUND", "race buyer");
                    wins.incrementAndGet();
                } catch (InsufficientStockException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "buyers did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one buyer may claim the last unit");
        assertEquals(buyers - 1, rejections.get(), "everyone else must be rejected");
        assertEquals(0, service.getProducts(null).stream()
                .filter(p -> p.getId() == productId).findFirst().orElseThrow().getCurrentStock());
    }

    @Test
    @DisplayName("N buyers racing a K-unit product: exactly K win, stock never goes negative")
    void twentyBuyersFiveUnits_exactlyFiveWin() throws InterruptedException {
        InventoryService service = newService();
        int stock = 5;
        long productId = addProduct(service, stock);

        int buyers = 20;
        ExecutorService pool = Executors.newFixedThreadPool(buyers);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(buyers);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < buyers; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.updateStock(productId, 1, "OUTBOUND", "race buyer");
                    wins.incrementAndGet();
                } catch (InsufficientStockException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "buyers did not finish in time");
        pool.shutdown();

        assertEquals(stock, wins.get(), "exactly " + stock + " buyers may win");
        assertEquals(buyers - stock, rejections.get());
        int finalStock = service.getProducts(null).stream()
                .filter(p -> p.getId() == productId).findFirst().orElseThrow().getCurrentStock();
        assertEquals(0, finalStock, "stock must land at exactly zero, never negative");
    }

    @Test
    @DisplayName("Disjoint products do not contend — all succeed in parallel")
    void disjointProductsAllSucceed() throws InterruptedException {
        InventoryService service = newService();
        int n = 6;
        long[] ids = new long[n];
        for (int i = 0; i < n; i++) {
            ids[i] = addProduct(service, 10);
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger();

        for (long id : ids) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.updateStock(id, 3, "OUTBOUND", "disjoint");
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "products did not finish in time");
        pool.shutdown();

        assertEquals(n, wins.get(), "all disjoint product sales must succeed in parallel");
    }

    @Test
    @DisplayName("Repeated last-unit race never produces two winners — 300 rounds")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            InventoryService service = newService();
            long productId = addProduct(service, 1);

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger();

            for (int i = 0; i < 2; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        service.updateStock(productId, 1, "OUTBOUND", "round buyer");
                        wins.incrementAndGet();
                    } catch (InsufficientStockException expected) {
                        // the loser — exactly right
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(1, wins.get(), "round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }
}
