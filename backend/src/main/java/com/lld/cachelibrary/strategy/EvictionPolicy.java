package com.lld.cachelibrary.strategy;

/**
 * Tracks bookkeeping (access order, frequency, insertion order — whatever the concrete policy
 * needs) for the keys held by a single cache shard, and decides which key to evict next. Every
 * method here is called only while the owning shard's lock is held, so implementations need no
 * synchronization of their own.
 */
public interface EvictionPolicy<K> {
    void onAccess(K key);
    void onInsert(K key);
    void onRemove(K key);

    /** The key that should be evicted next, or {@code null} if nothing is tracked. */
    K evictionCandidate();
}
