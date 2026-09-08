package com.lld.cachelibrary.cache;

/**
 * Decorator Pattern: wraps any {@link Cache} and counts hit/miss/eviction without the wrapped
 * implementation knowing stats exist at all — {@link ShardedCache} has no notion of "stats," it
 * only exposes an eviction listener callback that {@link com.lld.cachelibrary.builder.CacheBuilder}
 * wires to this decorator's shared {@link CacheStats} when {@code withStats()} is chosen.
 */
public class StatsDecorator<K, V> implements Cache<K, V> {

    private final Cache<K, V> delegate;
    private final CacheStats stats;

    public StatsDecorator(Cache<K, V> delegate, CacheStats stats) {
        this.delegate = delegate;
        this.stats = stats;
    }

    @Override
    public V get(K key) {
        V value = delegate.get(key);
        if (value != null) {
            stats.recordHit();
        } else {
            stats.recordMiss();
        }
        return value;
    }

    @Override
    public void put(K key, V value) {
        delegate.put(key, value);
    }

    @Override
    public void remove(K key) {
        delegate.remove(key);
    }

    @Override
    public int size() {
        return delegate.size();
    }

    @Override
    public void clear() {
        delegate.clear();
    }

    public CacheStats getStats() {
        return stats;
    }
}
