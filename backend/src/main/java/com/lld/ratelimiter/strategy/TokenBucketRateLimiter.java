package com.lld.ratelimiter.strategy;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitDecision;

import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Classic token bucket: a bucket holding up to {@code capacity} tokens, refilling continuously at
 * {@code refillPerSecond} tokens/second, capped at {@code capacity}. Every {@link #tryAcquire}
 * first refills based on elapsed time since the last refill, then consumes one token if available.
 * {@code tokens} is a {@code double} so a fractional refill rate (e.g. 0.5/s) accumulates
 * correctly instead of being floored away every call.
 *
 * <p>{@link #lock} guards the whole read-refill-decrement sequence — without it, two concurrent
 * callers could both read the same pre-refill token count and both succeed past capacity. Never
 * exposed via a getter (RCA-049): only {@link RateLimitDecision} — a plain DTO — ever leaves this
 * class.
 */
public class TokenBucketRateLimiter implements RateLimiter {

    private final ClientConfig config;
    private final ReentrantLock lock = new ReentrantLock();
    private final AtomicLong totalAllowed = new AtomicLong();
    private final AtomicLong totalDenied = new AtomicLong();

    private double tokens;
    private long lastRefillMillis;

    public TokenBucketRateLimiter(ClientConfig config, long nowEpochMillis) {
        this.config = config;
        this.tokens = config.getCapacityOrLimit();
        this.lastRefillMillis = nowEpochMillis;
    }

    private void refill(long nowEpochMillis) {
        if (nowEpochMillis <= lastRefillMillis) {
            return;
        }
        double elapsedSeconds = (nowEpochMillis - lastRefillMillis) / 1000.0;
        double capacity = config.getCapacityOrLimit();
        tokens = Math.min(capacity, tokens + elapsedSeconds * config.getRefillPerSecondOrWindowSeconds());
        lastRefillMillis = nowEpochMillis;
    }

    private long millisUntilNextToken(long nowEpochMillis) {
        double refillRate = config.getRefillPerSecondOrWindowSeconds();
        if (refillRate <= 0 || tokens >= 1) {
            return nowEpochMillis;
        }
        double secondsNeeded = (1 - tokens) / refillRate;
        return nowEpochMillis + Math.round(secondsNeeded * 1000);
    }

    @Override
    public RateLimitDecision tryAcquire(long nowEpochMillis) {
        lock.lock();
        try {
            refill(nowEpochMillis);
            if (tokens >= 1) {
                tokens -= 1;
                totalAllowed.incrementAndGet();
                return RateLimitDecision.builder()
                        .allowed(true)
                        .remaining((long) Math.floor(tokens))
                        .resetEpochMillis(nowEpochMillis)
                        .build();
            }
            totalDenied.incrementAndGet();
            return RateLimitDecision.builder()
                    .allowed(false)
                    .remaining(0)
                    .resetEpochMillis(millisUntilNextToken(nowEpochMillis))
                    .build();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public RateLimitDecision peek(long nowEpochMillis) {
        lock.lock();
        try {
            refill(nowEpochMillis);
            return RateLimitDecision.builder()
                    .allowed(tokens >= 1)
                    .remaining((long) Math.floor(tokens))
                    .resetEpochMillis(tokens >= 1 ? nowEpochMillis : millisUntilNextToken(nowEpochMillis))
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
