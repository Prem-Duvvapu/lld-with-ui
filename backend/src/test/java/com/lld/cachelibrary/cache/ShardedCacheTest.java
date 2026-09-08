package com.lld.cachelibrary.cache;

import com.lld.cachelibrary.model.EvictionPolicyType;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

public class ShardedCacheTest {

    @Test
    void getReturnsNullOnAMiss() {
        Cache<String, String> cache = new ShardedCache<>(1, 10, EvictionPolicyType.LRU, 0, null);
        assertNull(cache.get("missing"));
    }

    @Test
    void putThenGetRoundTrips() {
        Cache<String, String> cache = new ShardedCache<>(1, 10, EvictionPolicyType.LRU, 0, null);
        cache.put("a", "1");
        assertEquals("1", cache.get("a"));
    }

    @Test
    void singleShardEvictsAtCapacity() {
        Cache<String, String> cache = new ShardedCache<>(1, 2, EvictionPolicyType.LRU, 0, null);
        cache.put("a", "1");
        cache.put("b", "2");
        cache.put("c", "3"); // evicts "a" (LRU, never touched again after insert)

        assertNull(cache.get("a"), "the least-recently-used key must have been evicted");
        assertEquals("2", cache.get("b"));
        assertEquals("3", cache.get("c"));
        assertEquals(2, cache.size());
    }

    @Test
    void evictionListenerFiresWithTheEvictedKey() {
        AtomicReference<String> evicted = new AtomicReference<>();
        Cache<String, String> cache = new ShardedCache<>(1, 1, EvictionPolicyType.LRU, 0, evicted::set);
        cache.put("a", "1");
        cache.put("b", "2"); // must evict "a"

        assertEquals("a", evicted.get());
    }

    @Test
    void removeStopsAKeyFromBeingReturned() {
        Cache<String, String> cache = new ShardedCache<>(1, 10, EvictionPolicyType.LRU, 0, null);
        cache.put("a", "1");
        cache.remove("a");
        assertNull(cache.get("a"));
        assertEquals(0, cache.size());
    }

    @Test
    void clearWipesEveryShard() {
        Cache<String, String> cache = new ShardedCache<>(4, 40, EvictionPolicyType.LRU, 0, null);
        for (int i = 0; i < 20; i++) {
            cache.put("key-" + i, "value-" + i);
        }
        assertEquals(20, cache.size());

        cache.clear();
        assertEquals(0, cache.size());
    }

    @Test
    void entryExpiresAfterItsTtlElapses() throws InterruptedException {
        Cache<String, String> cache = new ShardedCache<>(1, 10, EvictionPolicyType.LRU, 50, null);
        cache.put("a", "1");
        assertEquals("1", cache.get("a"), "must still be alive immediately after put");

        Thread.sleep(120);
        assertNull(cache.get("a"), "must be expired well past its 50ms TTL");
    }

    @Test
    void zeroTtlMeansEntriesNeverExpire() throws InterruptedException {
        Cache<String, String> cache = new ShardedCache<>(1, 10, EvictionPolicyType.LRU, 0, null);
        cache.put("a", "1");
        Thread.sleep(50);
        assertEquals("1", cache.get("a"), "ttlMillis=0 must mean no expiry at all");
    }

    @Test
    void statsDecoratorCountsHitsMissesAndEvictions() {
        CacheStats stats = new CacheStats();
        ShardedCache<String, String> inner = new ShardedCache<>(1, 1, EvictionPolicyType.LRU, 0, key -> stats.recordEviction());
        Cache<String, String> cache = new StatsDecorator<>(inner, stats);

        cache.put("a", "1");
        cache.get("a");           // hit
        cache.get("does-not-exist"); // miss
        cache.put("b", "2");      // evicts "a"

        assertEquals(1, stats.getHits());
        assertEquals(1, stats.getMisses());
        assertEquals(1, stats.getEvictions());
    }

    @Test
    void differentEvictionPoliciesProduceDifferentSurvivors() {
        Cache<String, String> lru = new ShardedCache<>(1, 2, EvictionPolicyType.LRU, 0, null);
        lru.put("a", "1");
        lru.put("b", "2");
        lru.get("a"); // touch "a" -- "b" becomes LRU victim
        lru.put("c", "3");
        assertNull(lru.get("b"));
        assertNotNull(lru.get("a"));

        Cache<String, String> fifo = new ShardedCache<>(1, 2, EvictionPolicyType.FIFO, 0, null);
        fifo.put("a", "1");
        fifo.put("b", "2");
        fifo.get("a"); // FIFO ignores access -- "a" is still the oldest, must be evicted next
        fifo.put("c", "3");
        assertNull(fifo.get("a"));
        assertNotNull(fifo.get("b"));
    }
}
