package com.lld.kvstore.repository;

import com.lld.kvstore.exception.KeyNotFoundException;
import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.model.KvEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class KvStoreRepositoryTest {

    private KvStoreRepository repository;

    @BeforeEach
    void setUp() {
        repository = new KvStoreRepository();
    }

    @Test
    void firstSetStartsAtVersionOne() {
        KvEntry entry = repository.set("a", "1", null);
        assertEquals(1, entry.getVersion());
    }

    @Test
    void everySuccessfulSetIncrementsVersionByExactlyOne() {
        repository.set("a", "1", null);
        repository.set("a", "2", null);
        KvEntry third = repository.set("a", "3", null);
        assertEquals(3, third.getVersion());
    }

    @Test
    void getOnAMissingKeyThrowsKeyNotFoundException() {
        assertThrows(KeyNotFoundException.class, () -> repository.get("missing"));
    }

    @Test
    void deleteOnAMissingKeyThrowsKeyNotFoundException() {
        assertThrows(KeyNotFoundException.class, () -> repository.delete("missing"));
    }

    @Test
    void deleteRemovesTheKeyForGood() {
        repository.set("a", "1", null);
        repository.delete("a");
        assertThrows(KeyNotFoundException.class, () -> repository.get("a"));
    }

    @Test
    void casWithTheCorrectExpectedVersionSucceedsAndBumpsVersion() {
        KvEntry seed = repository.set("a", "1", null);
        KvEntry updated = repository.cas("a", seed.getVersion(), "2");
        assertEquals("2", updated.getValue());
        assertEquals(seed.getVersion() + 1, updated.getVersion());
    }

    @Test
    void casWithAStaleExpectedVersionThrowsVersionConflictException() {
        repository.set("a", "1", null);
        repository.set("a", "2", null); // now at version 2
        assertThrows(VersionConflictException.class, () -> repository.cas("a", 1, "3"));
        assertEquals("2", repository.get("a").getValue(), "a losing CAS must never overwrite the current value");
    }

    @Test
    void casOnAMissingKeyThrowsKeyNotFoundException() {
        assertThrows(KeyNotFoundException.class, () -> repository.cas("missing", 1, "x"));
    }

    @Test
    void everySuccessfulWriteAppendsToTheWal() {
        repository.set("a", "1", null);
        repository.set("a", "2", null);
        repository.delete("a");
        assertEquals(3, repository.getWal().size());
    }

    @Test
    void aFailedCasNeverAppendsToTheWal() {
        repository.set("a", "1", null);
        int sizeBefore = repository.getWal().size();
        assertThrows(VersionConflictException.class, () -> repository.cas("a", 999, "x"));
        assertEquals(sizeBefore, repository.getWal().size(), "a losing CAS must not be logged as if it succeeded");
    }

    @Test
    void replayFromWalRebuildsIdenticalStateFromNothing() {
        repository.set("a", "1", null);
        repository.set("b", "2", null);
        repository.set("a", "1-updated", null);
        repository.delete("b");

        KvEntry beforeReplay = repository.get("a");

        repository.replayFromWal();

        KvEntry afterReplay = repository.get("a");
        assertEquals(beforeReplay.getValue(), afterReplay.getValue());
        assertEquals(beforeReplay.getVersion(), afterReplay.getVersion());
        assertThrows(KeyNotFoundException.class, () -> repository.get("b"), "the WAL's DELETE must also be replayed");
    }

    @Test
    void expiredEntryIsTreatedAsMissingByGet() throws InterruptedException {
        repository.set("a", "1", 1L); // 1ms TTL
        Thread.sleep(10);
        assertThrows(KeyNotFoundException.class, () -> repository.get("a"));
    }

    @Test
    void resetWipesBothStoreAndWal() {
        repository.set("a", "1", null);
        repository.reset();
        assertThrows(KeyNotFoundException.class, () -> repository.get("a"));
        assertEquals(0, repository.getWal().size());
    }
}
