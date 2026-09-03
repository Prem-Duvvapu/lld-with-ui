package com.lld.ratelimiter.strategy;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.model.RateLimitDecision;

/**
 * Strategy interface for a single client's rate-limiting algorithm. An implementation owns its
 * own mutable state (tokens, window counters) and its own locking — the caller never needs to
 * coordinate concurrent callers itself. {@code nowEpochMillis} is passed in explicitly rather than
 * read from {@link System#currentTimeMillis()} internally, so the {@code /sim/*} engine can drive
 * a virtual clock deterministically instead of sleeping in real time (the same reason
 * {@code trafficsignal}'s {@code SignalTicker} is injectable rather than hardcoded).
 */
public interface RateLimiter {

    /** Attempts to consume one unit of capacity; mutates state if and only if it succeeds. */
    RateLimitDecision tryAcquire(long nowEpochMillis);

    /** Read-only view of current capacity — does not consume anything. */
    RateLimitDecision peek(long nowEpochMillis);

    ClientConfig getConfig();

    long getTotalAllowed();

    long getTotalDenied();
}
