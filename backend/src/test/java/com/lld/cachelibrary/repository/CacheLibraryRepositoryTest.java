package com.lld.cachelibrary.repository;

import com.lld.cachelibrary.builder.CacheBuilder;
import com.lld.cachelibrary.cache.Cache;
import com.lld.cachelibrary.model.CacheConfig;
import com.lld.cachelibrary.model.EvictionPolicyType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CacheLibraryRepositoryTest {

    private CacheLibraryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new CacheLibraryRepository();
    }

    @Test
    void freshRepositoryHasNoCacheConfigured() {
        assertNull(repository.getCache());
        assertNull(repository.getConfig());
        assertNull(repository.getStats());
    }

    @Test
    void configureStoresTheCacheAndConfigTogether() {
        CacheConfig config = CacheConfig.builder().maximumSize(5).evictionPolicy(EvictionPolicyType.LRU).shardCount(1).build();
        Cache<String, String> cache = CacheBuilder.<String, String>newBuilder().maximumSize(5).build();

        repository.configure(config, cache, null);

        assertSame(cache, repository.getCache());
        assertSame(config, repository.getConfig());
    }

    @Test
    void resetWipesEverything() {
        CacheConfig config = CacheConfig.builder().maximumSize(5).evictionPolicy(EvictionPolicyType.LRU).shardCount(1).build();
        Cache<String, String> cache = CacheBuilder.<String, String>newBuilder().maximumSize(5).build();
        repository.configure(config, cache, null);

        repository.reset();

        assertNull(repository.getCache());
        assertNull(repository.getConfig());
        assertNull(repository.getStats());
    }
}
