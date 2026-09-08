package com.lld.cachelibrary;

import com.lld.cachelibrary.cache.CacheStats;
import com.lld.cachelibrary.exception.KeyNotFoundException;
import com.lld.cachelibrary.model.CacheConfig;
import com.lld.cachelibrary.model.EvictionPolicyType;
import com.lld.cachelibrary.repository.CacheLibraryRepository;
import com.lld.cachelibrary.service.CacheLibraryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class CacheLibraryServiceTest {

    private CacheLibraryService service;

    @BeforeEach
    void setUp() {
        service = new CacheLibraryService(new CacheLibraryRepository());
    }

    @Test
    void constructorConfiguresADefaultLiveCacheReadyToUse() {
        service.put("a", "1");
        assertEquals("1", service.get("a"));
    }

    @Test
    void getOnAMissThrowsKeyNotFoundException() {
        assertThrows(KeyNotFoundException.class, () -> service.get("does-not-exist"));
    }

    @Test
    void configureReplacesTheLiveCacheEntirely() {
        service.put("before-reconfigure", "1");

        service.configure(CacheConfig.builder().maximumSize(5).evictionPolicy(EvictionPolicyType.FIFO).shardCount(1).build());

        assertThrows(KeyNotFoundException.class, () -> service.get("before-reconfigure"),
                "reconfiguring must start from a fresh cache, not carry old entries over");
    }

    @Test
    void statsAreTrackedWhenEnabledAndZeroedWhenNot() {
        service.configure(CacheConfig.builder().maximumSize(5).evictionPolicy(EvictionPolicyType.LRU).shardCount(1).withStats(true).build());
        service.put("a", "1");
        service.get("a");
        try {
            service.get("missing");
        } catch (KeyNotFoundException ignored) {
            // expected -- the miss itself is what we're counting
        }

        CacheStats stats = service.getStats();
        assertEquals(1, stats.getHits());
        assertEquals(1, stats.getMisses());

        service.configure(CacheConfig.builder().maximumSize(5).evictionPolicy(EvictionPolicyType.LRU).shardCount(1).withStats(false).build());
        CacheStats afterDisabling = service.getStats();
        assertEquals(0, afterDisabling.getHits(), "stats must read as zeroed, not throw, when tracking is off");
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        service.put("live-only", "1");

        Map<String, Object> snapshot = service.simPut("sim-only", "2");

        assertThrows(KeyNotFoundException.class, () -> {
            // The sim key must never leak into the live cache.
            service.get("sim-only");
        });
        assertEquals("1", service.get("live-only"), "the live cache must be untouched by sim activity");
        assertEquals(1, (int) snapshot.get("size"));
    }

    @Test
    void simResetWipesSimStateBackToASmallCleanCache() {
        service.simPut("a", "1");
        service.initSimState();

        Map<String, Object> snapshot = service.getSimSnapshots();
        assertEquals(0, (int) snapshot.get("size"));
    }

    @Test
    void simEvictionDemoFillingPastCapacityLogsAnEvictionEvent() {
        service.initSimState(); // maxSize=3, LRU, 1 shard
        service.simPut("a", "1");
        service.simPut("b", "2");
        service.simPut("c", "3");
        service.simPut("d", "4"); // must evict "a"

        boolean sawEviction = service.getSimEvents().stream().anyMatch(e -> e.getType().equals("EVICTION"));
        assertTrue(sawEviction, "filling past capacity must produce a logged EVICTION event");
    }

    @Test
    void simTtlExpiryDemoProvesTheKeyActuallyExpires() throws InterruptedException {
        Map<String, Object> snapshot = service.simTtlExpiryDemo();

        boolean sawExpiry = service.getSimEvents().stream().anyMatch(e -> e.getType().equals("TTL_EXPIRED"));
        assertTrue(sawExpiry, "the TTL demo must prove the key actually expired, not just that time passed");
    }

    @Test
    void simRaceAcrossFourShardsNeverExceedsGlobalCapacity() throws InterruptedException {
        Map<String, Object> snapshot = service.simRace(8);

        @SuppressWarnings("unchecked")
        Map<String, Object> raceResult = (Map<String, Object>) snapshot.get("raceResult");
        assertTrue((int) raceResult.get("finalSize") <= 8, "8 distinct-key puts into an 8-capacity cache must never exceed 8");
    }
}
