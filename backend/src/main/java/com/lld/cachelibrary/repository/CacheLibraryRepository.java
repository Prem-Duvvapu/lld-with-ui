package com.lld.cachelibrary.repository;

import com.lld.cachelibrary.cache.Cache;
import com.lld.cachelibrary.cache.CacheStats;
import com.lld.cachelibrary.model.CacheConfig;
import org.springframework.stereotype.Repository;

/**
 * Holds the ONE currently-configured live {@link Cache} instance and its config — pure state, no
 * building logic (that's {@code CacheBuilder}'s job) and no business rules (that's
 * {@code CacheLibraryService}'s). {@code CacheLibraryService} owns a second, independently
 * constructed instance of this class for its isolated {@code /sim/*} sandbox.
 */
@Repository
public class CacheLibraryRepository {

    private Cache<String, String> cache;
    private CacheStats stats;
    private CacheConfig config;

    public synchronized void configure(CacheConfig config, Cache<String, String> cache, CacheStats stats) {
        this.config = config;
        this.cache = cache;
        this.stats = stats;
    }

    public synchronized Cache<String, String> getCache() {
        return cache;
    }

    public synchronized CacheStats getStats() {
        return stats;
    }

    public synchronized CacheConfig getConfig() {
        return config;
    }

    public synchronized void reset() {
        cache = null;
        stats = null;
        config = null;
    }
}
