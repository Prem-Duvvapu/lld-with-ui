package com.lld.lrucache;

import com.lld.lrucache.model.LruCache;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * {@link LruCacheServiceTest#testConcurrentAccess} exercises the cache under load but only
 * asserts {@code hits > 0} — it would still pass even if capacity were silently exceeded or a
 * put were lost, exactly the lenient-concurrency-test trap RCA-006 warns about. These tests use
 * a {@link CountDownLatch} start gate (never a sleep) to line every thread up before releasing
 * them together, and assert the two invariants a bounded concurrent cache actually promises:
 * capacity is never exceeded, and no accepted write is ever lost or corrupted.
 */
@DisplayName("LruCache Concurrency — capacity bound and no lost/corrupted writes")
class LruCacheConcurrencyTest {

    @Test
    @DisplayName("N threads inserting N distinct keys into a smaller-capacity cache: size settles at exactly capacity, never above")
    void distinctKeyInsertsNeverExceedCapacity() throws InterruptedException {
        int capacity = 50;
        int threads = 200;
        LruCache<Integer, String> cache = new LruCache<>(capacity);

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger errors = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            final int key = i;
            pool.submit(() -> {
                try {
                    start.await();
                    cache.put(key, "value-" + key);
                } catch (Exception e) {
                    errors.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "puts did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(0, errors.get(), "no put should throw under concurrent access");
        assertEquals(capacity, cache.getSize(),
                "distinct keys > capacity must settle at exactly capacity (never above, never short due to lost writes)");
    }

    @Test
    @DisplayName("N threads inserting N distinct keys into a larger-capacity cache: every single write survives, none lost or corrupted")
    void distinctKeyInsertsUnderCapacityAreAllRetained() throws InterruptedException {
        int capacity = 1000;
        int threads = 500;
        LruCache<Integer, String> cache = new LruCache<>(capacity);

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            final int key = i;
            pool.submit(() -> {
                try {
                    start.await();
                    cache.put(key, "value-" + key);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "puts did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(threads, cache.getSize(), "no write should be lost when capacity is never a constraint");
        for (int i = 0; i < threads; i++) {
            assertEquals("value-" + i, cache.get(i), "value for key " + i + " must match exactly what was put — no corruption");
        }
    }

    @Test
    @DisplayName("Mixed concurrent GET/PUT storm on a small shared key space: capacity bound holds and every stored value is internally consistent")
    void mixedGetPutStormNeverExceedsCapacityOrCorrupts() throws InterruptedException {
        int capacity = 10;
        int keySpace = 20;
        int threads = 100;
        LruCache<Integer, String> cache = new LruCache<>(capacity);

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger errors = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            final int id = i;
            pool.submit(() -> {
                try {
                    start.await();
                    int key = id % keySpace;
                    if (id % 2 == 0) {
                        // Every writer for a given key writes the SAME value, so a torn read
                        // is impossible to hide behind "well the value just changed" — any
                        // value observed later for this key must be exactly this string.
                        cache.put(key, "fixed-value-" + key);
                    } else {
                        cache.get(key);
                    }
                } catch (Exception e) {
                    errors.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "storm did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(0, errors.get(), "no get/put should throw under concurrent access");
        assertTrue(cache.getSize() <= capacity,
                "cache size " + cache.getSize() + " must never exceed capacity " + capacity);

        // Every value still present must be exactly the fixed value for its key — never a
        // partially-written or foreign value from another key.
        for (int key = 0; key < keySpace; key++) {
            String value = cache.get(key);
            if (value != null) {
                assertEquals("fixed-value-" + key, value, "corrupted value for key " + key);
            }
        }
    }

    @Test
    @DisplayName("Concurrent remove() calls on the same key: exactly one thread observes true")
    void concurrentRemoveOfSameKeyIsLinearizable() throws InterruptedException {
        int threads = 20;
        LruCache<String, String> cache = new LruCache<>(5);
        cache.put("target", "value");

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        Set<Boolean> results = ConcurrentHashMap.newKeySet();
        AtomicInteger trueCount = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    boolean removed = cache.remove("target");
                    results.add(removed);
                    if (removed) trueCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "removes did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, trueCount.get(), "exactly one thread may successfully remove the key");
        assertNull(cache.get("target"));
    }
}
