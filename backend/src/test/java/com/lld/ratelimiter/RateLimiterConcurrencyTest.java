package com.lld.ratelimiter;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitAlgorithm;
import com.lld.ratelimiter.strategy.RateLimiter;
import com.lld.ratelimiter.strategy.SlidingWindowCounterRateLimiter;
import com.lld.ratelimiter.strategy.TokenBucketRateLimiter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Deterministic race tests: every thread calls {@code tryAcquire} with the exact same frozen
 * {@code now}, so refill/window-rollover is entirely eliminated as a variable — the only thing
 * that can make "more than capacity requests succeed" true or false is whether the limiter's
 * internal lock actually serializes the read-then-write. Without a correct lock, a
 * check-then-act race lets more than {@code capacity} threads read "tokens >= 1" before any of
 * them decrements, over-admitting requests — these tests fail reliably (not flakily) against a
 * version of either class with the {@code lock.lock()/unlock()} calls removed.
 */
@Timeout(30)
class RateLimiterConcurrencyTest {

    private static final int THREADS = 200;

    @RepeatedTest(5)
    @DisplayName("TokenBucket: under N concurrent callers, exactly capacity requests are allowed, no more")
    void tokenBucketAdmitsExactlyCapacityUnderConcurrency() throws InterruptedException {
        int capacity = 50;
        long frozenNow = 0L; // identical timestamp for every caller — refill is exactly zero
        ClientConfig config = ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.TOKEN_BUCKET)
                .capacityOrLimit(capacity)
                .refillPerSecondOrWindowSeconds(1.0)
                .build();
        RateLimiter limiter = new TokenBucketRateLimiter(config, frozenNow);

        int allowed = hammerConcurrently(limiter, frozenNow);

        assertEquals(capacity, allowed, "exactly the bucket's capacity must be admitted, regardless of thread interleaving");
        assertEquals(capacity, limiter.getTotalAllowed());
        assertEquals(THREADS - capacity, limiter.getTotalDenied());
    }

    @RepeatedTest(5)
    @DisplayName("SlidingWindowCounter: under N concurrent callers, exactly limit requests are allowed, no more")
    void slidingWindowAdmitsExactlyLimitUnderConcurrency() throws InterruptedException {
        int limit = 50;
        long frozenNow = 0L; // identical timestamp for every caller — window never rolls over
        ClientConfig config = ClientConfig.builder()
                .algorithm(RateLimitAlgorithm.SLIDING_WINDOW_COUNTER)
                .capacityOrLimit(limit)
                .refillPerSecondOrWindowSeconds(10.0) // 10-second window
                .build();
        RateLimiter limiter = new SlidingWindowCounterRateLimiter(config, frozenNow);

        int allowed = hammerConcurrently(limiter, frozenNow);

        assertEquals(limit, allowed, "exactly the configured limit must be admitted, regardless of thread interleaving");
        assertEquals(limit, limiter.getTotalAllowed());
        assertEquals(THREADS - limit, limiter.getTotalDenied());
    }

    /** Fires THREADS concurrent tryAcquire(frozenNow) calls, released simultaneously via a barrier. */
    private int hammerConcurrently(RateLimiter limiter, long frozenNow) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch ready = new CountDownLatch(THREADS);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger allowedCount = new AtomicInteger();

        List<Future<?>> futures = new java.util.ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            futures.add(pool.submit(() -> {
                ready.countDown();
                try {
                    go.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                if (limiter.tryAcquire(frozenNow).isAllowed()) {
                    allowedCount.incrementAndGet();
                }
            }));
        }

        ready.await();
        go.countDown();
        for (Future<?> f : futures) {
            try {
                f.get(10, TimeUnit.SECONDS);
            } catch (ExecutionException | TimeoutException e) {
                throw new RuntimeException(e);
            }
        }
        pool.shutdown();
        return allowedCount.get();
    }
}
