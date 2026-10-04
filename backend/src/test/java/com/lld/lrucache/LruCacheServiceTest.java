package com.lld.lrucache;

import com.lld.lrucache.service.LruCacheService;
import com.lld.lrucache.strategy.EvictionPolicyType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

public class LruCacheServiceTest {

    private LruCacheService cacheService;

    @BeforeEach
    public void setUp() {
        cacheService = new LruCacheService();
        cacheService.clear();
        cacheService.setCapacity(3);
    }

    @Test
    @DisplayName("Should put and get items correctly")
    public void testBasicPutAndGet() {
        cacheService.put("K1", "V1");
        cacheService.put("K2", "V2");

        assertEquals("V1", cacheService.get("K1"));
        assertEquals("V2", cacheService.get("K2"));
        assertNull(cacheService.get("K3"));
    }

    @Test
    void guidedSandboxWorkloadEvictsProductAndPreservesLiveCache() {
        cacheService.put("live-key", "live-value");
        cacheService.simClear();
        cacheService.simSetCapacity(5);
        cacheService.simSetPolicy(EvictionPolicyType.LRU);
        for (String key : new String[]{"user_session_101", "db_product_99", "cdn_banner_jpg", "api_rate_limit", "shopping_cart_5"}) {
            cacheService.simPut(key, "value-" + key);
        }
        assertNotNull(cacheService.simGet("user_session_101"));
        cacheService.simPut("new_order_808", "Order_Status_Placed");
        assertNull(cacheService.simGet("db_product_99"));
        Map<String, Object> snapshot = cacheService.getSimSnapshot();
        assertEquals(5, snapshot.get("size"));
        Map<?, ?> stats = (Map<?, ?>) snapshot.get("stats");
        assertEquals(1L, stats.get("hits"));
        assertEquals(1L, stats.get("misses"));
        assertEquals(1L, stats.get("evictions"));
        cacheService.simClear();
        assertEquals(0, cacheService.getSimSnapshot().get("size"));
        Map<?, ?> resetStats = (Map<?, ?>) cacheService.getSimSnapshot().get("stats");
        assertEquals(stats.get("hits"), resetStats.get("hits"));
        assertEquals(stats.get("misses"), resetStats.get("misses"));
        assertEquals(stats.get("evictions"), resetStats.get("evictions"));
        assertEquals("live-value", cacheService.get("live-key"));
        assertEquals(1, cacheService.getSnapshot().get("size"));
    }

    @Test
    @DisplayName("Should evict Least Recently Used item when capacity is exceeded")
    public void testLruEviction() {
        cacheService.put("K1", "V1");
        cacheService.put("K2", "V2");
        cacheService.put("K3", "V3");

        // Access K1 -> Moves K1 to MRU head. Order: K1, K3, K2 (LRU = K2)
        assertEquals("V1", cacheService.get("K1"));

        // Insert K4 -> Evicts LRU item (K2)
        cacheService.put("K4", "V4");

        assertNull(cacheService.get("K2"), "K2 should have been evicted as LRU item");
        assertEquals("V1", cacheService.get("K1"));
        assertEquals("V3", cacheService.get("K3"));
        assertEquals("V4", cacheService.get("K4"));
    }

    @Test
    @DisplayName("Should dynamically resize capacity and evict excess items")
    public void testCapacityResize() {
        cacheService.setCapacity(4);
        cacheService.put("A", "1");
        cacheService.put("B", "2");
        cacheService.put("C", "3");
        cacheService.put("D", "4");

        Map<String, Object> snap = cacheService.getSnapshot();
        assertEquals(4, snap.get("size"));

        // Resize capacity down to 2 -> should evict A and B (LRU items)
        cacheService.setCapacity(2);
        snap = cacheService.getSnapshot();
        assertEquals(2, snap.get("size"));
        assertNull(cacheService.get("A"));
        assertNull(cacheService.get("B"));
        assertNotNull(cacheService.get("C"));
        assertNotNull(cacheService.get("D"));
    }

    @Test
    @DisplayName("Should swap eviction policies dynamically")
    public void testPolicySwitching() {
        cacheService.setPolicy(EvictionPolicyType.FIFO);
        Map<String, Object> snap = cacheService.getSnapshot();
        assertEquals("FIFO", snap.get("policy"));

        cacheService.setPolicy(EvictionPolicyType.LFU);
        snap = cacheService.getSnapshot();
        assertEquals("LFU", snap.get("policy"));
    }

    @Test
    @DisplayName("Should handle high-concurrency put and get safely without corruption")
    public void testConcurrentAccess() throws InterruptedException {
        int threads = 10;
        int opsPerThread = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    for (int j = 0; j < opsPerThread; j++) {
                        String key = "K_" + (j % 5);
                        cacheService.put(key, "Val_" + threadId + "_" + j);
                        cacheService.get(key);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        Map<String, Object> stats = cacheService.getStats();
        assertNotNull(stats);
        assertTrue((long) stats.get("hits") > 0);
    }
}
