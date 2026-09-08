package com.lld.cachelibrary.builder;

import com.lld.cachelibrary.cache.Cache;
import com.lld.cachelibrary.cache.StatsDecorator;
import com.lld.cachelibrary.exception.InvalidCacheConfigException;
import com.lld.cachelibrary.model.EvictionPolicyType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CacheBuilderTest {

    @Test
    void buildsAPlainShardedCacheWithoutStatsByDefault() {
        Cache<String, String> cache = CacheBuilder.<String, String>newBuilder().maximumSize(10).build();
        assertFalse(cache instanceof StatsDecorator, "withStats() was never called -- no decorator should be present");
    }

    @Test
    void withStatsWrapsTheResultInAStatsDecorator() {
        Cache<String, String> cache = CacheBuilder.<String, String>newBuilder().maximumSize(10).withStats().build();
        assertTrue(cache instanceof StatsDecorator);
    }

    @Test
    void rejectsNonPositiveMaximumSize() {
        assertThrows(InvalidCacheConfigException.class, () -> CacheBuilder.newBuilder().maximumSize(0));
        assertThrows(InvalidCacheConfigException.class, () -> CacheBuilder.newBuilder().maximumSize(-5));
    }

    @Test
    void rejectsNonPositiveShardCount() {
        assertThrows(InvalidCacheConfigException.class, () -> CacheBuilder.newBuilder().shardCount(0));
    }

    @Test
    void shardCountIsClampedToNeverExceedMaximumSize() {
        // shardCount=8 with maximumSize=3 would round a shard's own capacity down to zero --
        // the builder must clamp shardCount instead of letting that happen.
        Cache<String, String> cache = CacheBuilder.<String, String>newBuilder().maximumSize(3).shardCount(8).build();
        for (int i = 0; i < 3; i++) {
            cache.put("key-" + i, "value-" + i);
        }
        assertEquals(3, cache.size(), "all 3 puts must fit -- no shard should have had zero capacity");
    }

    @Test
    void differentPolicyChoicesProduceIndependentlyConfiguredCaches() {
        Cache<String, String> lru = CacheBuilder.<String, String>newBuilder().maximumSize(1).evictionPolicy(EvictionPolicyType.LRU).build();
        Cache<String, String> fifo = CacheBuilder.<String, String>newBuilder().maximumSize(1).evictionPolicy(EvictionPolicyType.FIFO).build();

        lru.put("a", "1");
        lru.get("a");
        lru.put("b", "2");
        assertEquals("2", lru.get("b"));

        fifo.put("a", "1");
        fifo.get("a");
        fifo.put("b", "2");
        assertNull(fifo.get("a"), "FIFO must evict 'a' despite the access, unlike LRU");
    }

    @Test
    void onEvictionListenerFiresAlongsideStats() {
        java.util.concurrent.atomic.AtomicInteger customListenerCalls = new java.util.concurrent.atomic.AtomicInteger();
        Cache<String, String> cache = CacheBuilder.<String, String>newBuilder()
                .maximumSize(1)
                .withStats()
                .onEviction(key -> customListenerCalls.incrementAndGet())
                .build();

        cache.put("a", "1");
        cache.put("b", "2"); // evicts "a"

        assertEquals(1, customListenerCalls.get());
        assertEquals(1, ((StatsDecorator<String, String>) cache).getStats().getEvictions());
    }
}
