package com.lld.restaurant;

import com.lld.restaurant.exception.TableUnavailableException;
import com.lld.restaurant.model.RestaurantTable;
import com.lld.restaurant.model.TableStatus;
import com.lld.restaurant.model.Order;
import com.lld.restaurant.model.OrderLineRequest;
import com.lld.restaurant.repository.RestaurantRepository;
import com.lld.restaurant.service.KitchenService;
import com.lld.restaurant.service.RestaurantService;
import com.lld.restaurant.service.TableAllocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race in TableAllocationService.occupy(). Deleting
 * the per-table lock must make these fail. If they still pass without the lock
 * they are certifying the bug as fixed, which is worse than useless.
 */
@DisplayName("Restaurant Concurrency — Table Allocation Races")
class RestaurantConcurrencyTest {

    private RestaurantRepository repository;
    private TableAllocationService tableAllocation;
    private RestaurantService service;

    @BeforeEach
    void setUp() {
        repository = new RestaurantRepository();
        tableAllocation = new TableAllocationService(repository);
        KitchenService kitchenService = new KitchenService(repository);
        service = new RestaurantService(repository, tableAllocation, kitchenService);
    }

    @Test
    @DisplayName("Two waiters racing for one table: exactly one wins")
    void twoWaitersRacingForOneTable_onlyOneWins() throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    tableAllocation.occupy("T1", 2);
                    wins.incrementAndGet();
                } catch (TableUnavailableException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one waiter must win the table");
        assertEquals(1, rejections.get(), "exactly one waiter must be rejected");
    }

    @Test
    @DisplayName("Twenty waiters, one table: nineteen rejected")
    void twentyWaitersOneTable_nineteenRejected() throws InterruptedException {
        int n = 20;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (int i = 0; i < n; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    tableAllocation.occupy("T2", 2);
                    wins.incrementAndGet();
                } catch (TableUnavailableException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one waiter must win");
        assertEquals(n - 1, rejections.get(), "the rest must be rejected");
    }

    @Test
    @DisplayName("Disjoint tables all succeed — locks are per-table, not global")
    void disjointTablesAllSucceed() throws InterruptedException {
        String[] tables = {"T1", "T2", "T3", "T4", "T5", "T6"};
        int n = tables.length;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger();

        for (String tableId : tables) {
            pool.submit(() -> {
                try {
                    start.await();
                    tableAllocation.occupy(tableId, 2);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(n, wins.get(), "all 6 disjoint tables must succeed in parallel");
    }

    @Test
    @DisplayName("Repeated race never produces two winners — 300 rounds")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            RestaurantRepository freshRepo = new RestaurantRepository();
            TableAllocationService freshAlloc = new TableAllocationService(freshRepo);

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger();

            for (int t = 0; t < 2; t++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        freshAlloc.occupy("T1", 2);
                        wins.incrementAndGet();
                    } catch (TableUnavailableException expected) {
                        // normal
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

            assertEquals(1, wins.get(),
                    "round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }

    @Test
    @DisplayName("Released table can be reclaimed once")
    void releasedTableCanBeReclaimedOnce() throws InterruptedException {
        tableAllocation.occupy("T1", 2);
        assertEquals(TableStatus.OCCUPIED, repository.findTableById("T1").orElseThrow().getStatus());

        tableAllocation.release("T1");
        assertEquals(TableStatus.AVAILABLE, repository.findTableById("T1").orElseThrow().getStatus());

        // Reclaim it
        tableAllocation.occupy("T1", 2);
        assertEquals(TableStatus.OCCUPIED, repository.findTableById("T1").orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Concurrent orders all persist — no lost writes, no duplicate ids")
    void concurrentOrdersAllPersist() throws InterruptedException {
        // Seat multiple tables first
        String[] tables = {"T1", "T2", "T3", "T4", "T5", "T6"};
        for (String t : tables) {
            tableAllocation.occupy(t, 2);
        }

        int n = tables.length;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        List<String> orderIds = new CopyOnWriteArrayList<>();

        for (String tableId : tables) {
            pool.submit(() -> {
                try {
                    start.await();
                    Order order = service.placeOrder(tableId, "Waiter",
                            List.of(new OrderLineRequest("M-001", 1)), null);
                    orderIds.add(order.getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdown();

        assertEquals(n, orderIds.size(), "all orders should persist");
        assertEquals(n, Set.copyOf(orderIds).size(), "no duplicate order ids");
    }
}
