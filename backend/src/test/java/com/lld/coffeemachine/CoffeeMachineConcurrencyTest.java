package com.lld.coffeemachine;

import com.lld.coffeemachine.exception.InsufficientIngredientException;
import com.lld.coffeemachine.model.IngredientType;
import com.lld.coffeemachine.store.IngredientStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards {@link IngredientStore#checkAndDeductIngredients} against overdraft under concurrent
 * orders draining the same hopper — the shared mutable state multiple simultaneous brews contend
 * on. Each order's deduction is guarded by per-ingredient {@code ReentrantLock}s acquired in
 * ascending enum order (deadlock-free), but that only helps if every concurrent caller actually
 * observes a consistent stock level before deducting. If the check-then-deduct pair were not
 * atomic under the lock, concurrent orders could each see "enough stock" and jointly drive it
 * negative.
 *
 * <p>Deleting the per-ingredient locking (or checking availability outside the lock) must make
 * {@link #concurrentOrdersDrainingSameHopper_neverGoNegative} fail — exactly hopper/needed
 * orders succeed, every excess order gets {@link InsufficientIngredientException}, and final
 * stock is never negative.
 */
@DisplayName("Coffee Machine Concurrency — Ingredient Hopper Overdraft Prevention")
class CoffeeMachineConcurrencyTest {

    private IngredientStore store;

    @BeforeEach
    void setUp() {
        store = new IngredientStore();
    }

    @Test
    @DisplayName("Concurrent orders draining the same ingredient never oversell it")
    void concurrentOrdersDrainingSameHopper_neverGoNegative() throws InterruptedException {
        // Enough coffee beans for exactly 5 espresso shots (18g each) = 90g.
        int perOrder = 18;
        int stock = perOrder * 5;
        store.initIngredient(IngredientType.COFFEE_BEANS, stock, 2000, 100);

        int attempts = 20;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(attempts);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger insufficientIngredient = new AtomicInteger();
        AtomicInteger otherFailures = new AtomicInteger();

        for (int i = 0; i < attempts; i++) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    Map<IngredientType, Integer> req = new EnumMap<>(IngredientType.class);
                    req.put(IngredientType.COFFEE_BEANS, perOrder);
                    if (store.checkAndDeductIngredients(req)) {
                        succeeded.incrementAndGet();
                    }
                } catch (InsufficientIngredientException expected) {
                    insufficientIngredient.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception unexpected) {
                    otherFailures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "orders did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(0, otherFailures.get(), "no order should fail with anything but InsufficientIngredientException");
        assertEquals(5, succeeded.get(), "exactly stock/perOrder orders must succeed");
        assertEquals(attempts - 5, insufficientIngredient.get(), "every excess order must be rejected");
        assertEquals(0, store.getStock(IngredientType.COFFEE_BEANS), "stock must land at exactly zero, never negative");
    }

    @Test
    @DisplayName("Concurrent overlapping multi-ingredient orders never deadlock and never overdraft")
    void concurrentOverlappingOrders_deadlockFreeAndNeverNegative() throws InterruptedException {
        store.initIngredient(IngredientType.WATER, 500, 5000, 100);
        store.initIngredient(IngredientType.MILK, 500, 5000, 100);
        store.initIngredient(IngredientType.COFFEE_BEANS, 500, 5000, 100);

        int threads = 30;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            final int idx = i;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    Map<IngredientType, Integer> req = new EnumMap<>(IngredientType.class);
                    if (idx % 2 == 0) {
                        // Order A: beans + water, locks acquired COFFEE_BEANS -> WATER (ascending)
                        req.put(IngredientType.COFFEE_BEANS, 20);
                        req.put(IngredientType.WATER, 60);
                    } else {
                        // Order B: water + milk, opposite overlap on WATER
                        req.put(IngredientType.WATER, 60);
                        req.put(IngredientType.MILK, 40);
                    }
                    try {
                        if (store.checkAndDeductIngredients(req)) {
                            succeeded.incrementAndGet();
                        }
                    } catch (InsufficientIngredientException expected) {
                        rejected.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "orders did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(threads, succeeded.get() + rejected.get());
        assertTrue(store.getStock(IngredientType.WATER) >= 0, "water must never go negative");
        assertTrue(store.getStock(IngredientType.MILK) >= 0, "milk must never go negative");
        assertTrue(store.getStock(IngredientType.COFFEE_BEANS) >= 0, "beans must never go negative");
    }
}
