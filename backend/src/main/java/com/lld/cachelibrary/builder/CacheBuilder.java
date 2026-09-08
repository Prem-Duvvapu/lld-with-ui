package com.lld.cachelibrary.builder;

import com.lld.cachelibrary.cache.Cache;
import com.lld.cachelibrary.cache.CacheStats;
import com.lld.cachelibrary.cache.ShardedCache;
import com.lld.cachelibrary.cache.StatsDecorator;
import com.lld.cachelibrary.exception.InvalidCacheConfigException;
import com.lld.cachelibrary.model.EvictionPolicyType;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

/**
 * Builder Pattern: composes any {@link EvictionPolicyType} with optional TTL and optional stats
 * into one {@link Cache} — {@code CacheBuilder.<String,String>newBuilder()
 * .maximumSize(100).evictionPolicy(LFU).withStats().build()}. This is the module's centerpiece:
 * unlike {@code lru-cache}/{@code ttl-cache} (each a demo of one fixed algorithm), the same
 * builder produces nine genuinely different cache shapes from three independent, orthogonal
 * choices (eviction policy x TTL on/off x stats on/off) without the caller ever touching a
 * concrete class.
 */
public class CacheBuilder<K, V> {

    private int maximumSize = 100;
    private EvictionPolicyType evictionPolicy = EvictionPolicyType.LRU;
    private long ttlSeconds = 0;
    private int shardCount = 8;
    private boolean withStats = false;
    private final List<Consumer<K>> evictionListeners = new ArrayList<>();

    private CacheBuilder() {
    }

    public static <K, V> CacheBuilder<K, V> newBuilder() {
        return new CacheBuilder<>();
    }

    public CacheBuilder<K, V> maximumSize(int maximumSize) {
        if (maximumSize <= 0) {
            throw new InvalidCacheConfigException("maximumSize must be positive, got " + maximumSize);
        }
        this.maximumSize = maximumSize;
        return this;
    }

    public CacheBuilder<K, V> evictionPolicy(EvictionPolicyType evictionPolicy) {
        this.evictionPolicy = evictionPolicy;
        return this;
    }

    public CacheBuilder<K, V> ttlSeconds(long ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
        return this;
    }

    public CacheBuilder<K, V> shardCount(int shardCount) {
        if (shardCount <= 0) {
            throw new InvalidCacheConfigException("shardCount must be positive, got " + shardCount);
        }
        this.shardCount = shardCount;
        return this;
    }

    public CacheBuilder<K, V> withStats() {
        this.withStats = true;
        return this;
    }

    /** Advanced/demo hook: an extra listener notified whenever any shard evicts a key. */
    public CacheBuilder<K, V> onEviction(Consumer<K> listener) {
        this.evictionListeners.add(listener);
        return this;
    }

    public Cache<K, V> build() {
        // Never let shardCount round a shard's own capacity down to zero.
        int effectiveShardCount = Math.max(1, Math.min(shardCount, maximumSize));
        long ttlMillis = ttlSeconds > 0 ? ttlSeconds * 1000 : 0;

        List<Consumer<K>> listeners = new ArrayList<>(evictionListeners);
        CacheStats stats = null;
        if (withStats) {
            stats = new CacheStats();
            CacheStats statsRef = stats;
            listeners.add(key -> statsRef.recordEviction());
        }
        Consumer<K> combinedListener = listeners.isEmpty() ? null : key -> listeners.forEach(l -> l.accept(key));

        ShardedCache<K, V> shardedCache = new ShardedCache<>(effectiveShardCount, maximumSize, evictionPolicy, ttlMillis, combinedListener);
        return withStats ? new StatsDecorator<>(shardedCache, stats) : shardedCache;
    }
}
