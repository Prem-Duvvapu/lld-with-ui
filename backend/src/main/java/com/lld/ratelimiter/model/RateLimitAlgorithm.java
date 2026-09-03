package com.lld.ratelimiter.model;

/** Which {@link com.lld.ratelimiter.strategy.RateLimiter} strategy a client is configured with. */
public enum RateLimitAlgorithm {
    TOKEN_BUCKET,
    SLIDING_WINDOW_COUNTER
}
