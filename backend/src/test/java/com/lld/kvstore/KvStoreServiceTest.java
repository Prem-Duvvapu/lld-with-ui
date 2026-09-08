package com.lld.kvstore;

import com.lld.kvstore.exception.KeyNotFoundException;
import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.model.KvEntry;
import com.lld.kvstore.repository.KvStoreRepository;
import com.lld.kvstore.service.KvStoreService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class KvStoreServiceTest {

    private KvStoreService service;

    @BeforeEach
    void setUp() {
        service = new KvStoreService(new KvStoreRepository());
    }

    @Test
    void setThenGetRoundTrips() {
        service.set("a", "1", null);
        assertEquals("1", service.get("a").getValue());
    }

    @Test
    void getOnAMissThrowsKeyNotFoundException() {
        assertThrows(KeyNotFoundException.class, () -> service.get("missing"));
    }

    @Test
    void casSucceedsWithTheRightVersionAndFailsWithAStaleOne() {
        KvEntry seed = service.set("a", "1", null);
        service.cas("a", seed.getVersion(), "2");
        assertThrows(VersionConflictException.class, () -> service.cas("a", seed.getVersion(), "3"),
                "the version this thread knew about is now stale after the first successful CAS");
    }

    @Test
    void ttlSecondsIsConvertedToMillisCorrectly() throws InterruptedException {
        service.set("a", "1", 1L); // 1 second TTL
        assertEquals("1", service.get("a").getValue(), "must still be alive well within 1 second");
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        service.set("live-only", "1", null);
        service.simSet("sim-only", "2", null);

        assertThrows(KeyNotFoundException.class, () -> service.get("sim-only"),
                "the sim key must never leak into the live store");
        assertEquals("1", service.get("live-only").getValue(), "the live store must be untouched by sim activity");
    }

    @Test
    void simResetWipesSimStateBackToClean() {
        service.simSet("a", "1", null);
        service.initSimState();

        Map<String, Object> snapshot = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        Map<String, Object> entries = (Map<String, Object>) snapshot.get("entries");
        assertTrue(entries.isEmpty());
        assertEquals(0, snapshot.get("walSize"));
    }

    @Test
    void simReplayDemoRebuildsStateFromTheWal() {
        service.simSet("a", "1", null);
        service.simSet("a", "2", null);

        Map<String, Object> snapshot = service.simReplayDemo();

        boolean sawReplayed = service.getSimEvents().stream().anyMatch(e -> e.getType().equals("REPLAYED"));
        assertTrue(sawReplayed);
        @SuppressWarnings("unchecked")
        Map<String, Object> entries = (Map<String, Object>) snapshot.get("entries");
        assertTrue(entries.containsKey("a"), "replay must rebuild the key from the WAL, not lose it");
    }

    @Test
    void simTtlExpiryDemoProvesTheKeyActuallyExpires() throws InterruptedException {
        service.simTtlExpiryDemo();
        boolean sawExpiry = service.getSimEvents().stream().anyMatch(e -> e.getType().equals("TTL_EXPIRED"));
        assertTrue(sawExpiry, "the TTL demo must prove the key actually expired, not just that time passed");
    }

    @Test
    void simCasRaceHasExactlyOneWinner() throws InterruptedException {
        Map<String, Object> snapshot = service.simCasRace(8);

        @SuppressWarnings("unchecked")
        Map<String, Object> raceResult = (Map<String, Object>) snapshot.get("raceResult");
        assertEquals(1, raceResult.get("won"));
        assertEquals(7, raceResult.get("lost"));
    }
}
