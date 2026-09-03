package com.lld.ratelimiter.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The one thing every {@link com.lld.ratelimiter.strategy.RateLimiter} implementation returns
 * from a decision: was this request allowed, how many are left in the current
 * bucket/window, and when does capacity next become available. A plain, fully-immutable-shaped
 * DTO — never the strategy object itself — so a controller can always return it directly with
 * nothing to accidentally leak (the lesson of RCA-049: an internal lock or registry object
 * reachable through a getter on something Jackson serializes either throws or leaks raw state).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RateLimitDecision {
    private String clientId;
    private boolean allowed;
    private long remaining;
    private long resetEpochMillis;
}
