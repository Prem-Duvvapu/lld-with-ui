package com.lld.threadpool.repository;

import com.lld.threadpool.model.CustomThreadPool;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory store of named pools. Pure storage — not-found handling lives in the service, same
 *  split as {@code ratelimiter.repository.RateLimiterRepository}. */
@Repository
public class ThreadPoolRepository {

    private final Map<String, CustomThreadPool> pools = new ConcurrentHashMap<>();

    public void register(CustomThreadPool pool) {
        pools.put(pool.getPoolId(), pool);
    }

    public CustomThreadPool find(String poolId) {
        return pools.get(poolId);
    }

    public List<String> listPoolIds() {
        return List.copyOf(pools.keySet());
    }
}
