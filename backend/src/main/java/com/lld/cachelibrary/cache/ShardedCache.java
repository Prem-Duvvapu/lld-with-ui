package com.lld.cachelibrary.cache;

import com.lld.cachelibrary.model.EvictionPolicyType;
import com.lld.cachelibrary.strategy.EvictionPolicyFactory;

import java.util.function.Consumer;

/**
 * A segment/shard-locked cache — the same throughput idea real {@code ConcurrentHashMap} and
 * Guava/Caffeine caches use: partition keys across N independent {@link Shard}s, each with its
 * own lock and its own {@link com.lld.cachelibrary.strategy.EvictionPolicy} instance, so
 * concurrent operations on two DIFFERENT shards never contend with each other while operations
 * on the SAME key still serialize correctly (they always land on the same shard).
 *
 * <p>The global {@code maximumSize} is distributed evenly across shards (at least 1 per shard),
 * not enforced as a single hard ceiling — a deliberate trade-off documented in this module's
 * design write-up. {@link com.lld.cachelibrary.builder.CacheBuilder} clamps the shard count to
 * never exceed {@code maximumSize}, so a shard's capacity is never rounded down to zero.
 */
public class ShardedCache<K, V> implements Cache<K, V> {

    private final Shard<K, V>[] shards;
    private final int shardCount;
    private final long ttlMillis;
    private final Consumer<K> evictionListener;

    @SuppressWarnings("unchecked")
    public ShardedCache(int shardCount, int maximumSize, EvictionPolicyType policyType,
                         long ttlMillis, Consumer<K> evictionListener) {
        this.shardCount = shardCount;
        this.ttlMillis = ttlMillis;
        this.evictionListener = evictionListener;
        int perShardCapacity = Math.max(1, maximumSize / shardCount);
        this.shards = new Shard[shardCount];
        for (int i = 0; i < shardCount; i++) {
            shards[i] = new Shard<>(perShardCapacity, EvictionPolicyFactory.create(policyType));
        }
    }

    private Shard<K, V> shardFor(K key) {
        return shards[Math.floorMod(key.hashCode(), shardCount)];
    }

    @Override
    public V get(K key) {
        return shardFor(key).get(key, ttlMillis);
    }

    @Override
    public void put(K key, V value) {
        K evicted = shardFor(key).put(key, value, ttlMillis);
        if (evicted != null && evictionListener != null) {
            evictionListener.accept(evicted);
        }
    }

    @Override
    public void remove(K key) {
        shardFor(key).remove(key);
    }

    @Override
    public int size() {
        int total = 0;
        for (Shard<K, V> shard : shards) {
            total += shard.size();
        }
        return total;
    }

    @Override
    public void clear() {
        for (Shard<K, V> shard : shards) {
            shard.clear();
        }
    }
}
