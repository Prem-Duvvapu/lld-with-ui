package com.lld.kvstore.repository;

import com.lld.kvstore.command.Command;
import com.lld.kvstore.command.SetCommand;
import com.lld.kvstore.exception.KeyNotFoundException;
import com.lld.kvstore.exception.VersionConflictException;
import com.lld.kvstore.model.KvEntry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.spy;
import org.springframework.test.util.ReflectionTestUtils;

/** Pauses a real write at its log append, rather than hoping for a scheduler interleaving. */
class KvStoreReplayConcurrencyTest {

    @ParameterizedTest(name = "{0} append must precede a following {1}")
    @CsvSource({
            "SET, SET", "SET, CAS", "SET, DELETE", "SET, REPLAY", "SET, RESET",
            "CAS, SET", "CAS, CAS", "CAS, DELETE", "CAS, REPLAY", "CAS, RESET",
            "DELETE, SET", "DELETE, CAS", "DELETE, DELETE", "DELETE, REPLAY", "DELETE, RESET"
    })
    void aPendingAppendCannotBeOvertaken(String firstOperation, String nextOperation) throws Exception {
        KvStoreRepository repository = new KvStoreRepository();
        repository.set("key", "seed", null);
        WriteAheadLog log = spy((WriteAheadLog) ReflectionTestUtils.getField(repository, "wal"));
        ReflectionTestUtils.setField(repository, "wal", log);
        CountDownLatch appending = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch nextStarted = new CountDownLatch(1);
        doAnswer(call -> {
            if (Thread.currentThread().getName().equals("paused-writer")) {
                appending.countDown();
                assertTrue(release.await(5, TimeUnit.SECONDS), "append was never released");
            }
            return call.callRealMethod();
        }).when(log).append(any(Command.class));
        ExecutorService firstPool = Executors.newSingleThreadExecutor(task -> new Thread(task, "paused-writer"));
        ExecutorService nextPool = Executors.newSingleThreadExecutor();
        try {
            Future<?> first = firstPool.submit(() -> mutate(repository, firstOperation, "first", 1));
            assertTrue(appending.await(5, TimeUnit.SECONDS), "first write never reached its append");
            Future<?> next = nextPool.submit(() -> {
                nextStarted.countDown();
                if (firstOperation.equals("DELETE") && (nextOperation.equals("CAS") || nextOperation.equals("DELETE"))) {
                    assertThrows(KeyNotFoundException.class, () -> mutate(repository, nextOperation, "second", 2));
                } else {
                    mutate(repository, nextOperation, "second", 2);
                }
            });
            assertTrue(nextStarted.await(5, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> next.get(150, TimeUnit.MILLISECONDS),
                    "a same-key write or lifecycle operation overtook an unfinished append");
            release.countDown();
            first.get(5, TimeUnit.SECONDS);
            next.get(5, TimeUnit.SECONDS);
            Map<String, KvEntry> committed = repository.getAllEntries();
            repository.replayFromWal();
            assertEquals(committed, repository.getAllEntries(), "replay must preserve the committed result");
            if (nextOperation.equals("RESET")) {
                assertTrue(committed.isEmpty());
                assertEquals(0, repository.snapshot().commands().size(), "reset must not retain an in-flight command");
            } else if (nextOperation.equals("SET") || nextOperation.equals("CAS")) {
                if (!firstOperation.equals("DELETE") || nextOperation.equals("SET")) {
                    assertEquals("second", repository.get("key").getValue());
                    assertEquals(firstOperation.equals("DELETE") ? 1 : 3, repository.get("key").getVersion());
                }
            }
        } finally {
            release.countDown();
            firstPool.shutdownNow();
            nextPool.shutdownNow();
            assertTrue(firstPool.awaitTermination(5, TimeUnit.SECONDS));
            assertTrue(nextPool.awaitTermination(5, TimeUnit.SECONDS));
        }
    }

    @Test
    void failedWritesDoNotAppendAndDoNotPreventLaterWrites() {
        KvStoreRepository repository = new KvStoreRepository();
        repository.set("key", "seed", null);
        assertThrows(VersionConflictException.class, () -> repository.cas("key", 99, "rejected"));
        assertThrows(KeyNotFoundException.class, () -> repository.delete("missing"));
        assertThrows(KeyNotFoundException.class, () -> repository.cas("missing", 1, "rejected"));
        assertEquals(1, repository.snapshot().commands().size());
        repository.cas("key", 1, "accepted");
        repository.replayFromWal();
        assertEquals("accepted", repository.get("key").getValue());
        assertEquals(2, repository.snapshot().commands().size());
    }

    @Test
    void independentKeyWritesCanFinishWhileAnotherKeysAppendIsPaused() throws Exception {
        KvStoreRepository repository = new KvStoreRepository();
        WriteAheadLog log = spy((WriteAheadLog) ReflectionTestUtils.getField(repository, "wal"));
        ReflectionTestUtils.setField(repository, "wal", log);
        CountDownLatch appending = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(call -> {
            SetCommand command = call.getArgument(0);
            if (command.getKey().equals("a")) {
                appending.countDown();
                assertTrue(release.await(5, TimeUnit.SECONDS));
            }
            return call.callRealMethod();
        }).when(log).append(any(Command.class));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> first = pool.submit(() -> repository.set("a", "first", null));
            assertTrue(appending.await(5, TimeUnit.SECONDS));
            // "a" and "b" use distinct bins: a global write mutex would fail this assertion.
            KvEntry second = pool.submit(() -> repository.set("b", "independent", null)).get(2, TimeUnit.SECONDS);
            assertEquals("independent", second.getValue());
            release.countDown();
            first.get(5, TimeUnit.SECONDS);
            Map<String, KvEntry> committed = repository.getAllEntries();
            repository.replayFromWal();
            assertEquals(committed, repository.getAllEntries());
        } finally {
            release.countDown();
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS));
        }
    }

    @Test
    void snapshotWaitsForAppendAndReturnsMatchingEntriesAndCommands() throws Exception {
        KvStoreRepository repository = new KvStoreRepository();
        WriteAheadLog log = spy((WriteAheadLog) ReflectionTestUtils.getField(repository, "wal"));
        ReflectionTestUtils.setField(repository, "wal", log);
        CountDownLatch appending = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch reading = new CountDownLatch(1);
        doAnswer(call -> {
            appending.countDown();
            assertTrue(release.await(5, TimeUnit.SECONDS));
            return call.callRealMethod();
        }).when(log).append(any(Command.class));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> write = pool.submit(() -> repository.set("key", "value", 60_000L));
            assertTrue(appending.await(5, TimeUnit.SECONDS));
            Future<KvStoreRepository.Snapshot> read = pool.submit(() -> {
                reading.countDown();
                return repository.snapshot();
            });
            assertTrue(reading.await(5, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> read.get(150, TimeUnit.MILLISECONDS));
            release.countDown();
            write.get(5, TimeUnit.SECONDS);
            KvStoreRepository.Snapshot snapshot = read.get(5, TimeUnit.SECONDS);
            Map<String, KvEntry> reconstructed = new java.util.HashMap<>();
            snapshot.commands().forEach(command -> command.apply(reconstructed));
            assertEquals(snapshot.entries(), reconstructed);
            assertEquals(1, snapshot.commands().size());
            assertNotNull(snapshot.entries().get("key").getExpiresAtEpoch());
        } finally {
            release.countDown();
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS));
        }
    }

    @Test
    void aFailedAppendDoesNotPublishAMapChangeAndReleasesTheLifecycleGate() {
        KvStoreRepository repository = new KvStoreRepository();
        repository.set("key", "seed", null);
        WriteAheadLog log = spy((WriteAheadLog) ReflectionTestUtils.getField(repository, "wal"));
        ReflectionTestUtils.setField(repository, "wal", log);
        doAnswer(call -> { throw new IllegalStateException("append rejected"); }).when(log).append(any(Command.class));
        assertThrows(IllegalStateException.class, () -> repository.set("key", "set", null));
        assertThrows(IllegalStateException.class, () -> repository.cas("key", 1, "cas"));
        assertThrows(IllegalStateException.class, () -> repository.delete("key"));
        repository.replayFromWal();
        assertEquals("seed", repository.get("key").getValue());
        assertEquals(1, repository.snapshot().commands().size());
        repository.reset();
        assertTrue(repository.snapshot().entries().isEmpty());
    }

    @Test
    void returnedMutableEntriesCannotChangeStoredStateOrReplay() {
        KvStoreRepository repository = new KvStoreRepository();
        KvEntry setResult = repository.set("key", "seed", 60_000L);
        Long expiry = setResult.getExpiresAtEpoch();
        setResult.setVersion(500);
        repository.get("key").setValue("get mutation");
        repository.peek("key").orElseThrow().setExpiresAtEpoch(0L);
        repository.getAllEntries().get("key").setValue("snapshot mutation");
        KvEntry casResult = repository.cas("key", 1, "updated");
        casResult.setValue("cas mutation");
        KvEntry expected = new KvEntry("updated", 2, expiry);
        assertEquals(expected, repository.get("key"));
        repository.replayFromWal();
        assertEquals(expected, repository.get("key"));
    }

    @Test
    void rejectedExpiredCasDoesNotSilentlyRemoveAnUnloggedMapping() {
        KvStoreRepository repository = new KvStoreRepository();
        seedExpired(repository);
        KvStoreRepository.Snapshot before = repository.snapshot();
        assertThrows(KeyNotFoundException.class, () -> repository.cas("expired", 1, "rejected"));
        assertTrue(repository.peek("expired").isEmpty());
        assertEquals(before, repository.snapshot());
        repository.replayFromWal();
        assertEquals(before.entries(), repository.getAllEntries());
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PEEK", "SNAPSHOT"})
    void readersCannotObserveTheClearedMapDuringReplay(String operation) throws Exception {
        KvStoreRepository repository = new KvStoreRepository();
        repository.set("key", "value", null);
        WriteAheadLog log = spy((WriteAheadLog) ReflectionTestUtils.getField(repository, "wal"));
        ReflectionTestUtils.setField(repository, "wal", log);
        CountDownLatch replaying = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch reading = new CountDownLatch(1);
        doAnswer(call -> {
            replaying.countDown();
            assertTrue(release.await(5, TimeUnit.SECONDS));
            return call.callRealMethod();
        }).when(log).replay(any());
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> replay = pool.submit(repository::replayFromWal);
            assertTrue(replaying.await(5, TimeUnit.SECONDS));
            Future<KvEntry> read = pool.submit(() -> {
                reading.countDown();
                return switch (operation) {
                    case "GET" -> repository.get("key");
                    case "PEEK" -> repository.peek("key").orElseThrow();
                    default -> repository.snapshot().entries().get("key");
                };
            });
            assertTrue(reading.await(5, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> read.get(150, TimeUnit.MILLISECONDS));
            release.countDown();
            replay.get(5, TimeUnit.SECONDS);
            assertEquals(new KvEntry("value", 1, null), read.get(5, TimeUnit.SECONDS));
        } finally {
            release.countDown();
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS));
        }
    }

    @SuppressWarnings("unchecked")
    private static void seedExpired(KvStoreRepository repository) {
        Map<String, KvEntry> store = (Map<String, KvEntry>) ReflectionTestUtils.getField(repository, "store");
        WriteAheadLog log = (WriteAheadLog) ReflectionTestUtils.getField(repository, "wal");
        // Fixture uses an already elapsed timestamp so no wall-clock sleep controls this test.
        SetCommand expired = new SetCommand("expired", "old", 1L, 1);
        expired.apply(store);
        log.append(expired);
    }

    private void mutate(KvStoreRepository repository, String operation, String value, long expectedVersion) {
        switch (operation) {
            case "SET" -> repository.set("key", value, null);
            case "CAS" -> repository.cas("key", expectedVersion, value);
            case "DELETE" -> repository.delete("key");
            case "REPLAY" -> repository.replayFromWal();
            case "RESET" -> repository.reset();
            default -> throw new AssertionError("Unknown test operation: " + operation);
        }
    }
}
