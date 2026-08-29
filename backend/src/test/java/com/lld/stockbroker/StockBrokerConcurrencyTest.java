package com.lld.stockbroker;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.InsufficientFundsException;
import com.lld.stockbroker.exception.InsufficientStockException;
import com.lld.stockbroker.model.Account;
import com.lld.stockbroker.model.Holding;
import com.lld.stockbroker.model.Order;
import com.lld.stockbroker.model.OrderBook;
import com.lld.stockbroker.observer.InAppPriceObserver;
import com.lld.stockbroker.observer.LoggingPriceObserver;
import com.lld.stockbroker.service.StockBrokerService;
import com.lld.stockbroker.strategy.LimitExecutionStrategy;
import com.lld.stockbroker.strategy.MarketExecutionStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves the module's real concurrency story: order placement pre-reserves funds/shares under
 * {@link Account}'s own {@code ReentrantLock} (via {@code reserveFunds}/{@code Portfolio#reserveShares})
 * *before* the per-symbol {@code ReentrantLock} in {@code StockBrokerService#getLockForSymbol}
 * serializes the actual order-book matching — so both the reservation race and the matching race
 * need independent proof. Every test here is latch-gated (not sleep-based) so threads genuinely
 * start together instead of merely being likely to overlap.
 */
@DisplayName("StockBroker Concurrency — no double-spend, no oversell, no double-fill")
class StockBrokerConcurrencyTest {

    private StockBrokerService newService() {
        return new StockBrokerService(new MarketExecutionStrategy(), new LimitExecutionStrategy(),
                new InAppPriceObserver(), new LoggingPriceObserver());
    }

    @Test
    @DisplayName("(a) N concurrent BUY orders never reserve more cash than the account holds")
    void concurrentBuyOrdersNeverOverspend() throws InterruptedException {
        StockBrokerService service = newService();
        Account alice = service.getAccount("ACC-user-alice");
        double availableBefore = alice.getAvailableBalance(); // 250,000
        double costPerOrder = 50_000.0; // price 1000 * qty 50 — well below INFY's 1500 market price, so orders rest, never match
        int affordableOrders = (int) (availableBefore / costPerOrder); // exactly 5
        int threads = 20;

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.placeOrder("ACC-user-alice", "INFY", OrderSide.BUY, OrderType.LIMIT, 1000.0, 50);
                    succeeded.incrementAndGet();
                } catch (InsufficientFundsException expected) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(affordableOrders, succeeded.get(), "exactly as many orders as the balance affords should succeed");
        assertEquals(threads - affordableOrders, rejected.get());
        assertEquals(affordableOrders * costPerOrder, alice.getReservedBalance(), 0.001);
        assertEquals(0.0, alice.getAvailableBalance(), 0.001, "every last rupee of available balance is accounted for, never oversubscribed");
        assertEquals(availableBefore, alice.getCashBalance(), 0.001, "no order matched, so cash itself is untouched — only reserved");
    }

    @Test
    @DisplayName("(b) N concurrent SELL orders never reserve more shares than the account holds")
    void concurrentSellOrdersNeverOversell() throws InterruptedException {
        StockBrokerService service = newService();
        Account alice = service.getAccount("ACC-user-alice");
        Holding infyHolding = alice.getPortfolio().getHolding("INFY");
        int availableBefore = infyHolding.getAvailableQuantity(); // 50
        int qtyPerOrder = 10;
        int affordableOrders = availableBefore / qtyPerOrder; // exactly 5
        int threads = 20;

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    // Priced well above any resting bid so the order rests instead of matching.
                    service.placeOrder("ACC-user-alice", "INFY", OrderSide.SELL, OrderType.LIMIT, 5000.0, qtyPerOrder);
                    succeeded.incrementAndGet();
                } catch (InsufficientStockException expected) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(affordableOrders, succeeded.get(), "exactly as many sell orders as shares held should succeed");
        assertEquals(threads - affordableOrders, rejected.get());
        assertEquals(availableBefore, infyHolding.getReservedQuantity());
        assertEquals(0, infyHolding.getAvailableQuantity(), "no share is ever double-reserved past what's held");
        assertEquals(availableBefore, infyHolding.getQuantity(), "no order matched, so the underlying quantity itself is untouched");
    }

    @Test
    @DisplayName("(c) Many buyers racing one resting sell order never double-execute the same shares")
    void concurrentMatchingNeverDoubleFillsSameRestingOrder() throws InterruptedException {
        StockBrokerService service = newService();

        // Top Bob's seeded 30-share TCS position up to 100 so he can rest a single large sell.
        Account bobSetup = service.getAccount("ACC-user-bob");
        bobSetup.getPortfolio().addInitialHolding("TCS", 100, 3700.0);

        // Bob rests a single 100-share SELL for TCS at its market price so every buy below is marketable.
        Order restingSell = service.placeOrder("ACC-user-bob", "TCS", OrderSide.SELL, OrderType.LIMIT, 3800.0, 100);
        assertEquals(100, restingSell.getRemainingQuantity());

        int buyers = 25;
        int qtyEach = 5; // 25 * 5 = 125 total demand > Bob's 100-share supply
        for (int i = 0; i < buyers; i++) {
            service.createAccount("racer-" + i, "Racer " + i, "racer" + i + "@test.com", 1_000_000.0);
        }

        ExecutorService pool = Executors.newFixedThreadPool(buyers);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(buyers);
        List<Order> buyOrders = new CopyOnWriteArrayList<>();

        for (int i = 0; i < buyers; i++) {
            final String accId = "ACC-racer-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    Order order = service.placeOrder(accId, "TCS", OrderSide.BUY, OrderType.LIMIT, 3800.0, qtyEach);
                    buyOrders.add(order);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS));
        pool.shutdown();

        int totalFilled = buyOrders.stream().mapToInt(Order::getFilledQuantity).sum();
        assertEquals(100, totalFilled, "the 100 available shares are distributed exactly once each — never double-counted");
        assertEquals(0, restingSell.getRemainingQuantity());

        Account bob = service.getAccount("ACC-user-bob");
        Holding bobTcs = bob.getPortfolio().getHolding("TCS");
        // Bob topped up to exactly 100 TCS and sold exactly 100 — his holding must land at exactly
        // 0, never negative, proving executeSell() was applied exactly once per matched share.
        assertEquals(0, bobTcs.getQuantity(), "seller's holding lands at exactly zero — never negative from double-execution");

        OrderBook book = service.getOrderBook("TCS");
        int tradedQtyInHistory = book.getTradeHistory().stream().mapToInt(t -> t.getQuantity()).sum();
        assertEquals(100, tradedQtyInHistory, "recorded trade history sums to exactly the matched quantity, no phantom double trade");
    }
}
