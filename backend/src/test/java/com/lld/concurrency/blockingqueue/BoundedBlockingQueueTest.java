package com.lld.concurrency.blockingqueue;

import com.lld.concurrency.blockingqueue.model.BoundedBlockingQueue;
import com.lld.concurrency.blockingqueue.model.EventType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Proves {@link BoundedBlockingQueue} is a genuine blocking primitive: put()/take()
 * really park the calling thread via {@code Condition.await()} rather than
 * busy-spinning or returning early, spurious-wakeup handling (the {@code while}
 * loop) is correct under real contention, FIFO order holds, and the bound is never
 * violated under a many-producer/many-consumer stress run.
 *
 * <p>None of these tests use sleep-and-hope: blocking is proven with a
 * {@link CountDownLatch} tied to the {@code *_BLOCKED} trace event (which only
 * fires from inside the critical section, immediately before {@code await()}),
 * combined with a bounded {@link Thread#join(long)} that can only succeed once the
 * complementary operation actually unblocks the waiter.
 */
class BoundedBlockingQueueTest {

    @Test
    void constructorRejectsNonPositiveCapacity() {
        assertThrows(IllegalArgumentException.class, () -> new BoundedBlockingQueue<String>(0));
        assertThrows(IllegalArgumentException.class, () -> new BoundedBlockingQueue<String>(-3));
    }

    @Test
    @Timeout(10)
    void putGenuinelyBlocksWhenFullAndUnblocksOnlyAfterATake() throws InterruptedException {
        CountDownLatch blockedSignal = new CountDownLatch(1);
        BoundedBlockingQueue<String> queue = new BoundedBlockingQueue<>(1, (type, item, size) -> {
            if (type == EventType.ENQUEUE_BLOCKED) {
                blockedSignal.countDown();
            }
        });

        queue.put("A"); // fills the single slot without blocking
        assertEquals(1, queue.size());

        Thread producer = new Thread(() -> {
            try {
                queue.put("B");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "test-blocked-producer");
        producer.start();

        // The producer can only reach ENQUEUE_BLOCKED by having entered the
        // while(count==capacity) branch inside the lock — proof it genuinely
        // observed a full queue and is about to park on notFull.await().
        assertTrue(blockedSignal.await(5, TimeUnit.SECONDS), "producer never reported ENQUEUE_BLOCKED");

        // No take() has happened yet, so by the queue's own invariant put("B")
        // cannot have returned. A bounded join is the deterministic way to check
        // "still parked" without sleep-and-hope: it can only succeed early if the
        // thread actually finished, which is impossible here.
        producer.join(300);
        assertTrue(producer.isAlive(), "put() returned while the queue was still full");

        String taken = queue.take(); // frees the slot and signals notFull
        assertEquals("A", taken);

        producer.join(5000);
        assertFalse(producer.isAlive(), "put() never unblocked after a take() freed capacity");
        assertEquals(1, queue.size());
        assertEquals("B", queue.take());
    }

    @Test
    @Timeout(10)
    void takeGenuinelyBlocksWhenEmptyAndUnblocksOnlyAfterAPut() throws InterruptedException {
        CountDownLatch blockedSignal = new CountDownLatch(1);
        BoundedBlockingQueue<String> queue = new BoundedBlockingQueue<>(2, (type, item, size) -> {
            if (type == EventType.DEQUEUE_BLOCKED) {
                blockedSignal.countDown();
            }
        });

        AtomicInteger takenHolder = new AtomicInteger(-1);
        Thread consumer = new Thread(() -> {
            try {
                String v = queue.take();
                takenHolder.set(Integer.parseInt(v));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "test-blocked-consumer");
        consumer.start();

        assertTrue(blockedSignal.await(5, TimeUnit.SECONDS), "consumer never reported DEQUEUE_BLOCKED");

        consumer.join(300);
        assertTrue(consumer.isAlive(), "take() returned while the queue was still empty");

        queue.put("42"); // the only way the parked consumer can proceed

        consumer.join(5000);
        assertFalse(consumer.isAlive(), "take() never unblocked after a put() supplied an item");
        assertEquals(42, takenHolder.get());
    }

    @Test
    @Timeout(10)
    void singleProducerSingleConsumerPreservesFifoOrder() throws InterruptedException {
        int n = 200;
        BoundedBlockingQueue<Integer> queue = new BoundedBlockingQueue<>(4);
        List<Integer> consumed = new CopyOnWriteArrayList<>();

        Thread producer = new Thread(() -> {
            try {
                for (int i = 0; i < n; i++) {
                    queue.put(i);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "fifo-producer");

        Thread consumer = new Thread(() -> {
            try {
                for (int i = 0; i < n; i++) {
                    consumed.add(queue.take());
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "fifo-consumer");

        producer.start();
        consumer.start();
        producer.join(10_000);
        consumer.join(10_000);

        assertEquals(IntStream.range(0, n).boxed().collect(Collectors.toList()), consumed);
    }

    @Test
    @Timeout(30)
    void stressManyProducersManyConsumersDeliverEveryItemExactlyOnceWithoutExceedingCapacity()
            throws InterruptedException {
        int capacity = 8;
        int producers = 12;
        int consumers = 12;
        int itemsPerProducer = 100;
        int totalItems = producers * itemsPerProducer;

        AtomicInteger maxObservedSize = new AtomicInteger(0);
        BoundedBlockingQueue<String> queue = new BoundedBlockingQueue<>(capacity, (type, item, size) -> {
            maxObservedSize.updateAndGet(prev -> Math.max(prev, size));
        });

        Set<String> consumed = ConcurrentHashMap.newKeySet();
        AtomicInteger remainingToConsume = new AtomicInteger(totalItems);

        List<Thread> threads = new java.util.ArrayList<>();
        for (int p = 0; p < producers; p++) {
            int producerId = p;
            threads.add(new Thread(() -> {
                try {
                    for (int i = 0; i < itemsPerProducer; i++) {
                        queue.put("P" + producerId + "-" + i);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }, "stress-producer-" + p));
        }
        for (int c = 0; c < consumers; c++) {
            threads.add(new Thread(() -> {
                while (true) {
                    int before = remainingToConsume.getAndUpdate(v -> v > 0 ? v - 1 : v);
                    if (before <= 0) {
                        break;
                    }
                    try {
                        String item = queue.take();
                        boolean firstTime = consumed.add(item);
                        assertTrue(firstTime, "item consumed more than once: " + item);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }
            }, "stress-consumer-" + c));
        }

        threads.forEach(Thread::start);
        for (Thread t : threads) {
            t.join(25_000);
            assertFalse(t.isAlive(), t.getName() + " did not finish in time");
        }

        assertEquals(totalItems, consumed.size(), "every produced item must be consumed exactly once");
        assertTrue(maxObservedSize.get() <= capacity,
                "queue size observed " + maxObservedSize.get() + " which exceeds capacity " + capacity);
        assertEquals(0, queue.size(), "queue must be fully drained once every item is consumed");
    }
}
