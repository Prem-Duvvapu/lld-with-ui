package com.lld.concurrency.ttlcache;

import com.lld.concurrency.ttlcache.model.EventType;
import com.lld.concurrency.ttlcache.model.TtlCache;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves {@link TtlCache} is a genuine time-to-live cache: expiry is enforced both
 * lazily (on read, before the background sweep ever runs) and proactively (by a
 * real {@code ScheduledExecutorService} running on its own thread), a fresh
 * {@code put()} fully replaces a key's old value and TTL, and concurrent
 * put/get traffic on overlapping keys never corrupts state or throws.
 *
 * <p>Blocking/timing assertions use bounded polling or event-driven latches, never
 * a blind {@code Thread.sleep} with no verification.
 */
class TtlCacheTest {

    private final List<TtlCache> openCaches = new ArrayList<>();

    private TtlCache newCache(long sweepIntervalMillis) {
        TtlCache cache = new TtlCache(sweepIntervalMillis);
        openCaches.add(cache);
        return cache;
    }

    private TtlCache newCache(long sweepIntervalMillis, com.lld.concurrency.ttlcache.model.TraceRecorder recorder) {
        TtlCache cache = new TtlCache(sweepIntervalMillis, recorder);
        openCaches.add(cache);
        return cache;
    }

    @AfterEach
    void shutdownEveryCache() {
        for (TtlCache cache : openCaches) {
            cache.shutdown();
        }
        openCaches.clear();
    }

    @Test
    void constructorRejectsNonPositiveSweepInterval() {
        assertThrows(IllegalArgumentException.class, () -> new TtlCache(0));
        assertThrows(IllegalArgumentException.class, () -> new TtlCache(-100));
    }

    @Test
    void putRejectsNonPositiveTtl() {
        TtlCache cache = newCache(5000);
        assertThrows(IllegalArgumentException.class, () -> cache.put("k", "v", 0));
        assertThrows(IllegalArgumentException.class, () -> cache.put("k", "v", -1));
    }

    @Test
    void getOnMissingKeyReturnsEmpty() {
        TtlCache cache = newCache(5000);
        assertTrue(cache.get("never-put").isEmpty());
    }

    @Test
    @Timeout(10)
    void getPastTtlReturnsEmptyBeforeBackgroundSweepEverRuns() throws InterruptedException {
        // Sweep interval is deliberately huge (10s) so the first background sweep
        // cannot possibly have fired yet; if get() still reports the key gone, that
        // can only be the lazy, read-time expiry check catching it.
        TtlCache cache = newCache(10_000);
        cache.put("short-lived", "v1", 50);

        Thread.sleep(150); // comfortably past the 50ms TTL, nowhere near the 10s sweep

        Optional<String> result = cache.get("short-lived");
        assertTrue(result.isEmpty(), "get() must not return a value past its TTL, sweep or not");
    }

    @Test
    @Timeout(10)
    void backgroundSweeperGenuinelyEvictsAnExpiredEntryWithinOneSweepInterval() throws InterruptedException {
        CountDownLatch evicted = new CountDownLatch(1);
        AtomicBoolean sawExpectedKey = new AtomicBoolean(false);

        TtlCache cache = newCache(150, (type, key, value, ttlMillis, sizeNow) -> {
            if (type == EventType.BACKGROUND_EVICTION && "doomed".equals(key)) {
                sawExpectedKey.set(true);
                evicted.countDown();
            }
        });

        cache.put("doomed", "v1", 60);

        // Bounded wait tied to the real BACKGROUND_EVICTION trace event — not a
        // blind sleep. The sweep interval is 150ms, so one interval plus slack is
        // an ample, still-bounded ceiling.
        assertTrue(evicted.await(3, TimeUnit.SECONDS),
                "background sweeper never reported evicting the expired key within a bounded wait");
        assertTrue(sawExpectedKey.get());
        assertEquals(0, cache.size(), "sweeper must have actually removed the entry from the store");
    }

    @Test
    @Timeout(10)
    void freshPutOverwritesExistingKeysValueAndTtl() throws InterruptedException {
        TtlCache cache = newCache(10_000);

        cache.put("k", "v1", 50);
        Thread.sleep(100); // v1 would now be expired if it were still in effect

        cache.put("k", "v2", 5000); // overwrite: new value AND a fresh, much longer TTL

        Optional<String> result = cache.get("k");
        assertTrue(result.isPresent(), "overwrite must reset the TTL, not just the value");
        assertEquals("v2", result.get());
    }

    @Test
    @Timeout(30)
    void concurrentPutAndGetOnOverlappingKeysNeverCorruptsStateAndFinalStateMatchesLastWriterPerKey()
            throws InterruptedException {
        TtlCache cache = newCache(5000); // sweep interval irrelevant: TTLs outlive the whole test
        int keyCount = 8;
        int writesPerKey = 200;
        long ttlMillis = 60_000; // long enough that nothing expires mid-test

        String[] keys = new String[keyCount];
        for (int i = 0; i < keyCount; i++) {
            keys[i] = "key-" + i;
        }

        AtomicBoolean failure = new AtomicBoolean(false);
        List<Throwable> errors = new CopyOnWriteArrayList<>();

        // One dedicated writer thread per key: each key's writes are strictly
        // ordered (single thread, program order against a ConcurrentHashMap), so
        // the last value that thread wrote is deterministically the correct final
        // value for that key — while several keys are being written concurrently
        // and read concurrently by unrelated reader threads, genuinely exercising
        // overlapping concurrent access.
        List<Thread> writers = new ArrayList<>();
        for (String key : keys) {
            writers.add(new Thread(() -> {
                try {
                    for (int i = 0; i < writesPerKey; i++) {
                        cache.put(key, "v" + i, ttlMillis);
                    }
                } catch (Throwable t) {
                    failure.set(true);
                    errors.add(t);
                }
            }, "writer-" + key));
        }

        int readerCount = 8;
        AtomicInteger reads = new AtomicInteger(0);
        List<Thread> readers = new ArrayList<>();
        for (int r = 0; r < readerCount; r++) {
            readers.add(new Thread(() -> {
                try {
                    java.util.Random random = new java.util.Random();
                    for (int i = 0; i < writesPerKey * 2; i++) {
                        String key = keys[random.nextInt(keys.length)];
                        Optional<String> value = cache.get(key);
                        // Never corrupted: either absent (not yet written) or a
                        // well-formed "v<digits>" value — never a torn/garbled string.
                        value.ifPresent(v -> {
                            if (!v.matches("v\\d+")) {
                                failure.set(true);
                                errors.add(new AssertionError("corrupted value observed: " + v));
                            }
                        });
                        reads.incrementAndGet();
                    }
                } catch (Throwable t) {
                    failure.set(true);
                    errors.add(t);
                }
            }, "reader-" + r));
        }

        List<Thread> all = new ArrayList<>();
        all.addAll(writers);
        all.addAll(readers);
        all.forEach(Thread::start);
        for (Thread t : all) {
            t.join(20_000);
            assertFalse(t.isAlive(), t.getName() + " did not finish in time");
        }

        assertFalse(failure.get(), "concurrent access threw or observed corrupted state: " + errors);
        assertTrue(reads.get() > 0);

        for (String key : keys) {
            Optional<String> finalValue = cache.get(key);
            assertTrue(finalValue.isPresent(), "key " + key + " must still be present (long TTL)");
            assertEquals("v" + (writesPerKey - 1), finalValue.get(),
                    "final value for " + key + " must be exactly its single writer thread's last put");
        }
    }

    @Test
    @Timeout(10)
    void getMissDistinguishesNotFoundFromLazilyExpired() {
        CopyOnWriteArrayList<EventType> observed = new CopyOnWriteArrayList<>();
        TtlCache cache = newCache(10_000, (type, key, value, ttlMillis, sizeNow) -> observed.add(type));

        cache.get("never-existed");
        assertTrue(observed.contains(EventType.GET_MISS_NOT_FOUND));
        assertFalse(observed.contains(EventType.GET_MISS_EXPIRED));
    }

    @Test
    @Timeout(10)
    void shutdownStopsTheSweeperThreadCleanly() throws InterruptedException {
        TtlCache cache = newCache(50);
        // give the sweeper a moment to actually start and run at least once
        Thread.sleep(200);
        assertTrue(threadNamesSnapshot().stream().anyMatch(n -> n.contains("ttl-cache-sweeper")),
                "expected the sweeper thread to be running before shutdown");

        cache.shutdown();

        long deadline = System.currentTimeMillis() + 3000;
        boolean gone = false;
        while (System.currentTimeMillis() < deadline) {
            if (threadNamesSnapshot().stream().noneMatch(n -> n.contains("ttl-cache-sweeper"))) {
                gone = true;
                break;
            }
            Thread.sleep(50);
        }
        assertTrue(gone, "sweeper thread leaked past shutdown()");
    }

    private static Set<String> threadNamesSnapshot() {
        Set<String> names = ConcurrentHashMap.newKeySet();
        Thread.getAllStackTraces().keySet().forEach(t -> names.add(t.getName()));
        return names;
    }
}
