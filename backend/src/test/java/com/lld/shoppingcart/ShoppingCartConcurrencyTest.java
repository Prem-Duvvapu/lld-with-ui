package com.lld.shoppingcart;

import com.lld.shoppingcart.model.*;
import com.lld.shoppingcart.payment.*;
import com.lld.shoppingcart.service.ShoppingCartService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The load-bearing concurrency suite for {@code ShoppingCartService#placeOrder}'s ascending
 * product-id lock ordering -- the same deadlock-avoidance idiom {@code digitalwallet}'s
 * {@code TransferCommand} uses for two-account transfers, applied here per order to however many
 * products a cart touches.
 */
public class ShoppingCartConcurrencyTest {

    private ShoppingCartService service;

    @BeforeEach
    public void setUp() {
        List<PaymentStrategy> strategies = List.of(
                new CreditCardPaymentStrategy(),
                new DebitCardPaymentStrategy(),
                new UpiPaymentStrategy(),
                new WalletPaymentStrategy()
        );
        service = new ShoppingCartService(new ShoppingCartPaymentProcessor(strategies));
    }

    /**
     * Two users' carts touch the SAME two products but in OPPOSITE insertion order: user "u-a"
     * adds "P-LOW" then "P-HIGH" (cart-insertion order LOW, HIGH); user "u-b" adds "P-HIGH" then
     * "P-LOW" (cart-insertion order HIGH, LOW). If {@code placeOrder} locked products in
     * cart-insertion order, checking out both carts concurrently could deadlock: thread A holds
     * LOW and waits for HIGH while thread B holds HIGH and waits for LOW -- a classic circular
     * wait. Because {@code placeOrder} instead sorts by {@code Product#getId} ascending before
     * locking, both threads always attempt to acquire the SAME product first regardless of their
     * own cart's insertion order, so the circular-wait precondition can never form. This test
     * proves that empirically: both checkouts complete well within the timeout using
     * {@code CountDownLatch}-synchronized threads (no sleeps), never a naturally-occurring pass
     * that got lucky on scheduling.
     */
    @Test
    @Timeout(10)
    public void oppositeInsertionOrderCheckoutsNeverDeadlock() throws Exception {
        service.addProduct(new Product("P-HIGH", "High-ID Product", Category.ELECTRONICS, 100.0, 10));
        service.addProduct(new Product("P-LOW", "Low-ID Product", Category.ELECTRONICS, 50.0, 10));
        service.registerUser(new User("u-a", "User A", "a@test.com", "Addr A"));
        service.registerUser(new User("u-b", "User B", "b@test.com", "Addr B"));

        // u-a's cart: inserted LOW then HIGH.
        service.addToCart("u-a", "P-LOW", 1);
        service.addToCart("u-a", "P-HIGH", 1);
        // u-b's cart: inserted HIGH then LOW -- the OPPOSITE insertion order, same two products.
        service.addToCart("u-b", "P-HIGH", 1);
        service.addToCart("u-b", "P-LOW", 1);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);
        AtomicInteger errors = new AtomicInteger(0);

        Runnable checkoutA = () -> {
            try {
                startLatch.await();
                service.placeOrder("u-a", PaymentMethod.UPI, null);
            } catch (Exception e) {
                errors.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        };
        Runnable checkoutB = () -> {
            try {
                startLatch.await();
                service.placeOrder("u-b", PaymentMethod.CREDIT_CARD, null);
            } catch (Exception e) {
                errors.incrementAndGet();
            } finally {
                doneLatch.countDown();
            }
        };

        executor.submit(checkoutA);
        executor.submit(checkoutB);
        startLatch.countDown(); // release both threads at once, racing for the same two locks

        // If the lock ordering were insertion-order based, this could hang forever (deadlock).
        // @Timeout(10) on the whole test is the outer safety net; this awaits with its own bound
        // so a genuine deadlock fails fast with a clear assertion rather than the JUnit timeout kill.
        boolean finished = doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdownNow();

        assertTrue(finished, "Both concurrent checkouts must complete -- a hang here means the lock ordering let a circular wait form");
        assertEquals(0, errors.get(), "Neither checkout should have thrown an unexpected exception");
        assertEquals(8, service.getProduct("P-HIGH").getStockQuantity(), "Both checkouts decremented P-HIGH by 1 each (10 - 1 - 1)");
        assertEquals(8, service.getProduct("P-LOW").getStockQuantity(), "Both checkouts decremented P-LOW by 1 each (10 - 1 - 1)");
    }

    /**
     * Repeats the opposite-order race many times with fresh carts each round -- a single lucky
     * interleaving proves nothing; a stable pattern across many rounds is closer to proof.
     */
    @Test
    @Timeout(30)
    public void oppositeInsertionOrderCheckoutsNeverDeadlockAcrossManyRounds() throws Exception {
        service.addProduct(new Product("P-HIGH", "High-ID Product", Category.ELECTRONICS, 100.0, 1000));
        service.addProduct(new Product("P-LOW", "Low-ID Product", Category.ELECTRONICS, 50.0, 1000));

        int rounds = 50;
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < rounds; round++) {
                String userA = "round-" + round + "-a";
                String userB = "round-" + round + "-b";
                service.registerUser(new User(userA, "A", userA + "@test.com", "Addr"));
                service.registerUser(new User(userB, "B", userB + "@test.com", "Addr"));
                service.addToCart(userA, "P-LOW", 1);
                service.addToCart(userA, "P-HIGH", 1);
                service.addToCart(userB, "P-HIGH", 1);
                service.addToCart(userB, "P-LOW", 1);

                CountDownLatch startLatch = new CountDownLatch(1);
                Future<?> fa = executor.submit(() -> {
                    try {
                        startLatch.await();
                        service.placeOrder(userA, PaymentMethod.UPI, null);
                    } catch (InterruptedException ignored) {
                    }
                });
                Future<?> fb = executor.submit(() -> {
                    try {
                        startLatch.await();
                        service.placeOrder(userB, PaymentMethod.UPI, null);
                    } catch (InterruptedException ignored) {
                    }
                });
                startLatch.countDown();
                fa.get(2, TimeUnit.SECONDS);
                fb.get(2, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        assertEquals(1000 - 2 * rounds, service.getProduct("P-HIGH").getStockQuantity());
        assertEquals(1000 - 2 * rounds, service.getProduct("P-LOW").getStockQuantity());
    }

    /**
     * A retried {@code placeOrder} call with the same idempotency key must return the IDENTICAL
     * order object and must NOT decrement stock or invoke the payment strategy a second time.
     */
    @Test
    public void retriedPlaceOrderWithSameIdempotencyKeyDoesNotDoubleDecrementStockOrChargeTwice() {
        AtomicInteger paymentCalls = new AtomicInteger(0);
        PaymentStrategy countingUpi = new PaymentStrategy() {
            @Override
            public String processPayment(String orderId, double amount) {
                paymentCalls.incrementAndGet();
                return "TX-COUNTED-" + paymentCalls.get();
            }

            @Override
            public PaymentMethod getMethod() {
                return PaymentMethod.UPI;
            }
        };
        ShoppingCartService counted = new ShoppingCartService(new ShoppingCartPaymentProcessor(List.of(countingUpi)));
        counted.addProduct(new Product("P1", "Widget", Category.ELECTRONICS, 10.0, 5));
        counted.registerUser(new User("u1", "Alice", "a@test.com", "Addr"));
        counted.addToCart("u1", "P1", 2);

        Order first = counted.placeOrder("u1", PaymentMethod.UPI, "IDEMP-DOUBLE-CHARGE-CHECK");
        assertEquals(1, paymentCalls.get());
        assertEquals(3, counted.getProduct("P1").getStockQuantity()); // 5 - 2

        Order second = counted.placeOrder("u1", PaymentMethod.UPI, "IDEMP-DOUBLE-CHARGE-CHECK");

        assertSame(first, second, "Retry with the same idempotency key must return the identical cached Order instance");
        assertEquals(1, paymentCalls.get(), "Payment strategy must NOT be invoked a second time on a cache hit");
        assertEquals(3, counted.getProduct("P1").getStockQuantity(), "Stock must NOT be decremented a second time on a cache hit");
    }

    /**
     * The idempotency guarantee must hold under real concurrent retries too, not just sequential
     * ones: many threads racing to place the "same" order under the same idempotency key must all
     * observe exactly one payment and exactly one stock decrement.
     */
    @Test
    @Timeout(10)
    public void concurrentRetriesWithSameIdempotencyKeyStillChargeExactlyOnce() throws Exception {
        AtomicInteger paymentCalls = new AtomicInteger(0);
        PaymentStrategy countingUpi = new PaymentStrategy() {
            @Override
            public String processPayment(String orderId, double amount) {
                paymentCalls.incrementAndGet();
                return "TX-" + paymentCalls.get();
            }

            @Override
            public PaymentMethod getMethod() {
                return PaymentMethod.UPI;
            }
        };
        ShoppingCartService counted = new ShoppingCartService(new ShoppingCartPaymentProcessor(List.of(countingUpi)));
        counted.addProduct(new Product("P1", "Widget", Category.ELECTRONICS, 10.0, 100));
        counted.registerUser(new User("u1", "Alice", "a@test.com", "Addr"));
        counted.addToCart("u1", "P1", 1);

        int threads = 12;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<Order>> futures = new java.util.ArrayList<>();
        for (int i = 0; i < threads; i++) {
            futures.add(executor.submit(() -> {
                startLatch.await();
                return counted.placeOrder("u1", PaymentMethod.UPI, "IDEMP-RACE");
            }));
        }
        startLatch.countDown();

        Order reference = futures.get(0).get(5, TimeUnit.SECONDS);
        for (Future<Order> f : futures) {
            assertSame(reference, f.get(5, TimeUnit.SECONDS), "Every concurrent retry must resolve to the SAME cached order");
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(1, paymentCalls.get(), "Exactly one payment call must have occurred across all concurrent retries");
        assertEquals(99, counted.getProduct("P1").getStockQuantity(), "Stock decremented exactly once (100 - 1)");
    }
}
