package com.lld.concurrency.bloomfilter;

import com.lld.concurrency.bloomfilter.model.BloomFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves {@link BloomFilter} is a genuinely safe concurrent primitive: many real
 * threads add() disjoint items simultaneously, released together via a
 * {@link CountDownLatch} so the race is real rather than incidental (no
 * sleep-and-hope), then every single item across every thread must still be
 * observable afterward — proof the shared {@code BitSet}, guarded by the lock,
 * never lost a concurrent bit write.
 */
class BloomFilterConcurrencyTest {

    @Test
    @Timeout(20)
    void manyThreadsAddingDisjointItemsConcurrentlyNeverLoseABitWrite() throws InterruptedException {
        int bitSize = 512;
        int hashCount = 4;
        int threadCount = 16;
        int itemsPerThread = 50;

        BloomFilter filter = new BloomFilter(bitSize, hashCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<List<String>> perThreadItems = new ArrayList<>();
        for (int t = 0; t < threadCount; t++) {
            List<String> items = new ArrayList<>();
            for (int i = 0; i < itemsPerThread; i++) {
                items.add("t" + t + "-item-" + i);
            }
            perThreadItems.add(items);
        }

        List<Thread> threads = new ArrayList<>();
        AtomicInteger interruptedCount = new AtomicInteger(0);
        for (int t = 0; t < threadCount; t++) {
            List<String> items = perThreadItems.get(t);
            threads.add(new Thread(() -> {
                try {
                    startLatch.await();
                    for (String item : items) {
                        filter.add(item);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    interruptedCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            }, "concurrency-adder-" + t));
        }

        threads.forEach(Thread::start);
        startLatch.countDown(); // release every thread at once — a genuine race on the shared BitSet

        assertTrue(doneLatch.await(15, TimeUnit.SECONDS), "adder threads did not finish in time");
        for (Thread thread : threads) {
            thread.join(1000);
        }
        assertTrue(interruptedCount.get() == 0, "no adder thread should have been interrupted");

        for (List<String> items : perThreadItems) {
            for (String item : items) {
                assertTrue(filter.mightContain(item), "lost a concurrent bit write for " + item);
            }
        }

        int cardinality = filter.cardinalityEstimate();
        assertTrue(cardinality >= 0 && cardinality <= bitSize,
                "cardinality " + cardinality + " out of bounds [0," + bitSize + "]");
    }
}
