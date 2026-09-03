package com.lld.ratelimiter.strategy;

import com.lld.ratelimiter.exception.InvalidRateLimitConfigException;
import com.lld.ratelimiter.model.ClientConfig;
import org.springframework.stereotype.Component;

/**
 * Creates a fresh, stateful {@link RateLimiter} instance for a client's {@link ClientConfig}.
 * Unlike a registry-of-singletons factory (e.g. {@code SplitStrategyFactory}), this must build a
 * new instance per call: each client's bucket/window state is unique to that client, never shared.
 */
@Component
public class RateLimiterFactory {

    public RateLimiter create(ClientConfig config, long nowEpochMillis) {
        if (config == null || config.getAlgorithm() == null) {
            throw new InvalidRateLimitConfigException("A client config must specify an algorithm.");
        }
        if (config.getCapacityOrLimit() <= 0) {
            throw new InvalidRateLimitConfigException("capacityOrLimit must be positive, got " + config.getCapacityOrLimit() + ".");
        }
        if (config.getRefillPerSecondOrWindowSeconds() <= 0) {
            throw new InvalidRateLimitConfigException("refillPerSecondOrWindowSeconds must be positive, got " + config.getRefillPerSecondOrWindowSeconds() + ".");
        }
        return switch (config.getAlgorithm()) {
            case TOKEN_BUCKET -> new TokenBucketRateLimiter(config, nowEpochMillis);
            case SLIDING_WINDOW_COUNTER -> new SlidingWindowCounterRateLimiter(config, nowEpochMillis);
        };
    }
}
