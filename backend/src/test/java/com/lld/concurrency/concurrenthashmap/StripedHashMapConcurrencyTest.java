package com.lld.concurrency.concurrenthashmap;

import com.lld.concurrency.concurrenthashmap.model.StripedHashMap;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves {@link StripedHashMap} is genuinely thread-safe under real contention —
 * not merely "usually correct" — using {@link CountDownLatch}-gated thread release
 * rather than sleep-and-hope timing. Every thread blocks on the same latch and is
 * released together, so the operations genuinely interleave inside the JVM instead
 * of running in some accidental near-sequential order.
 */
class StripedHashMapConcurrencyTest {

    @Test
    @Timeout(20)
    void manyThreadsMergeIncrementingTheSameKeyLoseNoUpdates() throws InterruptedException {
        int threadCount = 16;
        int incrementsPerThread = 500;
        StripedHashMap<String, Long> map = new StripedHashMap<>(8);

        CountDownLatch startGate = new CountDownLatch(1);
        List<Thread> threads = new ArrayList<>(threadCount);
        for (int t = 0; t < threadCount; t++) {
            threads.add(new Thread(() -> {
                try {
                    startGate.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                for (int i = 0; i < incrementsPerThread; i++) {
                    map.merge("shared-counter", 1L, Long::sum);
                }
            }, "merge-racer-" + t));
        }

        threads.forEach(Thread::start);
        startGate.countDown();
        for (Thread thread : threads) {
            thread.join(15_000);
            assertFalse(thread.isAlive(), thread.getName() + " did not finish in time");
        }

        assertEquals((long) threadCount * incrementsPerThread, map.get("shared-counter"),
                "concurrent merge() calls must lose no updates under real contention");
    }

    @Test
    @Timeout(20)
    void manyThreadsComputeIfAbsentRacingTheSameKeyComputeExactlyOnce() throws InterruptedException {
        int racerCount = 20;
        StripedHashMap<String, String> map = new StripedHashMap<>(8);
        AtomicInteger computeCount = new AtomicInteger(0);
        Set<String> observedResults = ConcurrentHashMap.newKeySet();

        CountDownLatch startGate = new CountDownLatch(1);
        List<Thread> threads = new ArrayList<>(racerCount);
        for (int r = 0; r < racerCount; r++) {
            threads.add(new Thread(() -> {
                try {
                    startGate.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                String result = map.computeIfAbsent("shared-key", key -> {
                    computeCount.incrementAndGet();
                    return "computed-once";
                });
                observedResults.add(result);
            }, "compute-racer-" + r));
        }

        threads.forEach(Thread::start);
        startGate.countDown();
        for (Thread thread : threads) {
            thread.join(15_000);
            assertFalse(thread.isAlive(), thread.getName() + " did not finish in time");
        }

        assertEquals(1, computeCount.get(), "the mapping function must run exactly once across all racers");
        assertEquals(Set.of("computed-once"), observedResults, "every racer must observe the same computed value");
        assertTrue(threads.stream().noneMatch(Thread::isAlive));
    }
}
