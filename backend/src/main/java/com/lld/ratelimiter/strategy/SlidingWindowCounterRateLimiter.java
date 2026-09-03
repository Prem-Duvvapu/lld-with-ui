package com.lld.ratelimiter.strategy;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitDecision;

import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Sliding window counter: splits time into fixed windows of {@code windowSeconds}, counts requests
 * in the current window, and estimates the true sliding-window count as
 * {@code currentWindowCount + previousWindowCount * (fraction of the current window remaining)}.
 * This approximates a true sliding log without storing a timestamp per request — the same
 * trade-off real rate limiters (e.g. Cloudflare's) make.
 *
 * <p>{@link #lock} guards window-rollover plus the read-estimate-increment sequence for the same
 * reason {@link TokenBucketRateLimiter} needs one: two concurrent callers must not both read the
 * same pre-increment estimate and both be admitted past the limit.
 */
public class SlidingWindowCounterRateLimiter implements RateLimiter {

    private final ClientConfig config;
    private final long windowMillis;
    private final ReentrantLock lock = new ReentrantLock();
    private final AtomicLong totalAllowed = new AtomicLong();
    private final AtomicLong totalDenied = new AtomicLong();

    private long currentWindowStart;
    private long currentWindowCount;
    private long previousWindowCount;

    public SlidingWindowCounterRateLimiter(ClientConfig config, long nowEpochMillis) {
        this.config = config;
        this.windowMillis = Math.max(1, Math.round(config.getRefillPerSecondOrWindowSeconds() * 1000));
        this.currentWindowStart = nowEpochMillis;
    }

    /** Rolls the window forward without an unbounded loop, even across a large simulated jump. */
    private void advanceWindow(long nowEpochMillis) {
        long elapsed = nowEpochMillis - currentWindowStart;
        if (elapsed < windowMillis) {
            return;
        }
        long windowsElapsed = elapsed / windowMillis;
        if (windowsElapsed >= 2) {
            previousWindowCount = 0;
            currentWindowCount = 0;
        } else {
            previousWindowCount = currentWindowCount;
            currentWindowCount = 0;
        }
        currentWindowStart += windowsElapsed * windowMillis;
    }

    private double estimatedCount(long nowEpochMillis) {
        double elapsedInCurrent = nowEpochMillis - currentWindowStart;
        double weight = Math.max(0.0, 1.0 - (elapsedInCurrent / windowMillis));
        return currentWindowCount + previousWindowCount * weight;
    }

    @Override
    public RateLimitDecision tryAcquire(long nowEpochMillis) {
        lock.lock();
        try {
            advanceWindow(nowEpochMillis);
            double estimated = estimatedCount(nowEpochMillis);
            long limit = config.getCapacityOrLimit();
            if (estimated < limit) {
                currentWindowCount++;
                totalAllowed.incrementAndGet();
                long remaining = Math.max(0, limit - (long) Math.ceil(estimatedCount(nowEpochMillis)));
                return RateLimitDecision.builder()
                        .allowed(true)
                        .remaining(remaining)
                        .resetEpochMillis(currentWindowStart + windowMillis)
                        .build();
            }
            totalDenied.incrementAndGet();
            return RateLimitDecision.builder()
                    .allowed(false)
                    .remaining(0)
                    .resetEpochMillis(currentWindowStart + windowMillis)
                    .build();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public RateLimitDecision peek(long nowEpochMillis) {
        lock.lock();
        try {
            advanceWindow(nowEpochMillis);
            long limit = config.getCapacityOrLimit();
            long remaining = Math.max(0, limit - (long) Math.ceil(estimatedCount(nowEpochMillis)));
            return RateLimitDecision.builder()
                    .allowed(remaining > 0)
                    .remaining(remaining)
                    .resetEpochMillis(currentWindowStart + windowMillis)
                    .build();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public ClientConfig getConfig() {
        return config;
    }

    @Override
    public long getTotalAllowed() {
        return totalAllowed.get();
    }

    @Override
    public long getTotalDenied() {
        return totalDenied.get();
    }
}
