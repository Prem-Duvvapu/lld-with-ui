package com.lld.circuitbreaker;

import com.lld.circuitbreaker.clock.SystemClock;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.CircuitPhase;
import com.lld.circuitbreaker.strategy.ConsecutiveFailureTripPolicy;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Timeout;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * {@code attemptCall()} holds its lock for the entire operation — the check-then-act sequence
 * (is a call currently allowed, then count the result, then maybe trip) never happens outside
 * that lock. Without it, N threads could all observe {@code consecutiveFailures < threshold}
 * before any of their increments land, letting far more than {@code threshold} failing calls
 * through as "attempted" before the trip is even noticed — a classic lost-update race. This test
 * proves the exact opposite: with {@code threshold} concurrent failing threads racing against
 * {@code THRESHOLD}, exactly {@code THRESHOLD} of them are ever attempted, and the breaker ends in
 * one single, consistent state.
 */
class CircuitBreakerConcurrencyTest {

    private static final int THRESHOLD = 5;
    private static final int THREAD_COUNT = 30;

    @RepeatedTest(5)
    @Timeout(10)
    @org.junit.jupiter.api.DisplayName("N threads racing failing calls trip the breaker exactly once, at exactly the threshold")
    void concurrentFailuresTripExactlyOnce() throws InterruptedException {
        CircuitBreaker breaker = new CircuitBreaker("race-service", new ConsecutiveFailureTripPolicy(THRESHOLD), 60_000L, 50, new SystemClock());

        CountDownLatch ready = new CountDownLatch(THREAD_COUNT);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(THREAD_COUNT);
        AtomicInteger attempted = new AtomicInteger(0);
        AtomicInteger rejected = new AtomicInteger(0);
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);

        try {
            for (int i = 0; i < THREAD_COUNT; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        start.await();
                        breaker.attemptCall(false);
                        attempted.incrementAndGet();
                    } catch (com.lld.circuitbreaker.exception.CircuitOpenException ex) {
                        rejected.incrementAndGet();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            ready.await(5, TimeUnit.SECONDS);
            start.countDown(); // release every thread at once
            done.await(5, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        assertEquals(THREAD_COUNT, attempted.get() + rejected.get(),
                "every thread must be accounted for exactly once — no call lost or double-counted");
        assertEquals(THRESHOLD, attempted.get(),
                "exactly THRESHOLD calls should have been attempted before the breaker tripped");
        assertEquals(THREAD_COUNT - THRESHOLD, rejected.get());
        assertEquals(CircuitPhase.OPEN, breaker.getPhase());
        assertEquals(THRESHOLD, breaker.getConsecutiveFailures(),
                "consecutiveFailures must land on exactly THRESHOLD, not more (would indicate a lost-update race)");
        assertEquals(THRESHOLD, breaker.getTotalCalls());
        assertEquals(THREAD_COUNT - THRESHOLD, breaker.getTotalRejections());
    }
}
