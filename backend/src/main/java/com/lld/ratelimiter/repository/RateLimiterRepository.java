package com.lld.ratelimiter.repository;

import com.lld.ratelimiter.model.ClientConfig;
import com.lld.ratelimiter.strategy.RateLimiter;
import com.lld.ratelimiter.strategy.RateLimiterFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store of one {@link RateLimiter} instance per client id. {@link #findOrCreate} uses
 * {@link ConcurrentHashMap#computeIfAbsent} so first-touch client creation is atomic — no separate
 * top-level lock is needed for that, and each returned {@link RateLimiter} then guards its own
 * state with its own internal lock (see {@code TokenBucketRateLimiter}/
 * {@code SlidingWindowCounterRateLimiter}), so unrelated clients never contend with each other.
 *
 * <p>The Spring-managed instance of this class backs production; {@code RateLimiterService} also
 * constructs a second, plain (non-bean) instance for the isolated {@code /sim/*} sandbox, sharing
 * the same {@link RateLimiterFactory} bean but never the same client map.
 */
@Repository
public class RateLimiterRepository {

    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    private final RateLimiterFactory factory;

    public RateLimiterRepository(RateLimiterFactory factory) {
        this.factory = factory;
    }

    public RateLimiter findOrCreate(String clientId, ClientConfig defaultConfig, long nowEpochMillis) {
        return limiters.computeIfAbsent(clientId, id -> factory.create(defaultConfig, nowEpochMillis));
    }

    public RateLimiter find(String clientId) {
        return limiters.get(clientId);
    }

    public void configure(String clientId, ClientConfig config, long nowEpochMillis) {
        limiters.put(clientId, factory.create(config, nowEpochMillis));
    }

    public List<String> listClientIds() {
        return List.copyOf(limiters.keySet());
    }

    public void clear() {
        limiters.clear();
    }
}
