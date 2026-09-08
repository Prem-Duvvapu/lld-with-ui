package com.lld.cachelibrary.cache;

/**
 * The one contract every cache shape in this library honors — a hand-built {@link ShardedCache}
 * or a {@link StatsDecorator} wrapping one. {@code get} returns {@code null} on a miss, matching
 * standard cache semantics (java.util.Map, Guava, Caffeine); it is the demo REST layer's own
 * choice, not this interface's, to turn a miss into an HTTP 404.
 */
public interface Cache<K, V> {
    V get(K key);
    void put(K key, V value);
    void remove(K key);
    int size();
    void clear();
}
