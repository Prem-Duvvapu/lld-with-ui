package com.lld.lrucache;

import com.lld.lrucache.exception.InvalidCapacityException;
import com.lld.lrucache.model.LruCache;
import com.lld.lrucache.strategy.EvictionPolicyType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Model/strategy-level unit tests for {@link LruCache}. This module has no repository package —
 * all state lives directly on the {@code LruCache} model instance (there is no per-entity
 * persistence layer to test separately) — so the "repository" test flavour is folded in here and
 * in {@link LruCacheServiceTest} instead of being skipped silently.
 */
class LruCacheModelTest {

    @Test
    @DisplayName("constructing a cache with a non-positive capacity throws InvalidCapacityException")
    void constructorRejectsNonPositiveCapacity() {
        assertThrows(InvalidCapacityException.class, () -> new LruCache<String, String>(0));
        assertThrows(InvalidCapacityException.class, () -> new LruCache<String, String>(-5));
    }

    @Test
    @DisplayName("setCapacity rejects zero and negative values, leaving the cache untouched")
    void setCapacityRejectsNonPositiveValues() {
        LruCache<String, String> cache = new LruCache<>(3);
        cache.put("a", "1");

        assertThrows(InvalidCapacityException.class, () -> cache.setCapacity(0));
        assertThrows(InvalidCapacityException.class, () -> cache.setCapacity(-1));

        // Rejected resize must not have mutated state.
        assertEquals(3, cache.getCapacity());
        assertEquals("1", cache.get("a"));
    }

    @Test
    @DisplayName("LRU policy evicts the least-recently-used key, not the least-recently-inserted")
    void lruPolicyEvictsLeastRecentlyUsed() {
        LruCache<String, String> cache = new LruCache<>(2);
        cache.put("a", "1");
        cache.put("b", "2");
        cache.get("a");       // a is now MRU; b is LRU
        cache.put("c", "3");  // evicts b, not a

        assertNull(cache.get("b"));
        assertEquals("1", cache.get("a"));
        assertEquals("3", cache.get("c"));
    }

    @Test
    @DisplayName("FIFO policy evicts by insertion order regardless of access pattern")
    void fifoPolicyEvictsByInsertionOrder() {
        LruCache<String, String> cache = new LruCache<>(2);
        cache.setPolicy(EvictionPolicyType.FIFO);
        cache.put("a", "1");
        cache.put("b", "2");
        cache.get("a"); // access does NOT protect 'a' under FIFO
        cache.put("c", "3"); // evicts 'a', the first one in

        assertNull(cache.get("a"));
        assertEquals("2", cache.get("b"));
        assertEquals("3", cache.get("c"));
    }

    @Test
    @DisplayName("LFU policy evicts the least-frequently-accessed key")
    void lfuPolicyEvictsLeastFrequentlyUsed() {
        LruCache<String, String> cache = new LruCache<>(2);
        cache.setPolicy(EvictionPolicyType.LFU);
        cache.put("a", "1");
        cache.put("b", "2");
        cache.get("a");
        cache.get("a"); // a accessed 3 times total (1 insert + 2 gets), b accessed once (insert)
        cache.put("c", "3"); // evicts 'b', the least frequently used

        assertNull(cache.get("b"));
        assertEquals("1", cache.get("a"));
        assertEquals("3", cache.get("c"));
    }

    @Test
    @DisplayName("removing a key that is not present is a no-op that returns false")
    void removeMissingKeyReturnsFalse() {
        LruCache<String, String> cache = new LruCache<>(2);
        assertFalse(cache.remove("ghost"));
    }

    @Test
    @DisplayName("clear() empties the cache and resets size to zero")
    void clearEmptiesCache() {
        LruCache<String, String> cache = new LruCache<>(3);
        cache.put("a", "1");
        cache.put("b", "2");
        cache.clear();
        assertEquals(0, cache.getSize());
        assertNull(cache.get("a"));
    }
}
