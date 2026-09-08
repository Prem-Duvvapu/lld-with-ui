package com.lld.cachelibrary.cache;

import com.lld.cachelibrary.strategy.EvictionPolicy;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/**
 * One segment of a {@link ShardedCache} — its own map, its own {@link EvictionPolicy} instance,
 * and its own {@link ReentrantLock}. Package-private: {@link ShardedCache} is the only caller,
 * and every public method here holds the shard's lock across its entire body, closing the
 * classic check-then-act eviction race — see {@link #put} for the one that matters.
 */
final class Shard<K, V> {

    private final int capacity;
    private final EvictionPolicy<K> evictionPolicy;
    private final Map<K, CacheEntry<V>> entries = new HashMap<>();
    private final ReentrantLock lock = new ReentrantLock();

    Shard(int capacity, EvictionPolicy<K> evictionPolicy) {
        this.capacity = capacity;
        this.evictionPolicy = evictionPolicy;
    }

    V get(K key, long ttlMillis) {
        lock.lock();
        try {
            CacheEntry<V> entry = entries.get(key);
            if (entry == null) {
                return null;
            }
            if (isExpired(entry, ttlMillis)) {
                entries.remove(key);
                evictionPolicy.onRemove(key);
                return null;
            }
            evictionPolicy.onAccess(key);
            return entry.getValue();
        } finally {
            lock.unlock();
        }
    }

    /**
     * Holds the lock across "is this shard at capacity? evict one if so, THEN insert" as one
     * atomic sequence. Splitting the capacity check and the eviction+insert into separate locked
     * blocks would let two concurrent putters on this shard both observe "at capacity" and each
     * evict one entry for what should have been a single net eviction, overshooting capacity.
     *
     * @return the evicted key, or {@code null} if no eviction was needed.
     */
    K put(K key, V value, long ttlMillis) {
        lock.lock();
        try {
            boolean isNewKey = !entries.containsKey(key);
            K evictedKey = null;
            if (isNewKey && entries.size() >= capacity) {
                evictedKey = evictionPolicy.evictionCandidate();
                if (evictedKey != null) {
                    entries.remove(evictedKey);
                    evictionPolicy.onRemove(evictedKey);
                }
            }
            long expiresAt = ttlMillis > 0 ? System.currentTimeMillis() + ttlMillis : Long.MAX_VALUE;
            entries.put(key, new CacheEntry<>(value, expiresAt));
            if (isNewKey) {
                evictionPolicy.onInsert(key);
            } else {
                evictionPolicy.onAccess(key);
            }
            return evictedKey;
        } finally {
            lock.unlock();
        }
    }

    void remove(K key) {
        lock.lock();
        try {
            if (entries.remove(key) != null) {
                evictionPolicy.onRemove(key);
            }
        } finally {
            lock.unlock();
        }
    }

    int size() {
        lock.lock();
        try {
            return entries.size();
        } finally {
            lock.unlock();
        }
    }

    void clear() {
        lock.lock();
        try {
            entries.clear();
        } finally {
            lock.unlock();
        }
    }

    private boolean isExpired(CacheEntry<V> entry, long ttlMillis) {
        return ttlMillis > 0 && System.currentTimeMillis() >= entry.getExpiresAtEpoch();
    }
}
