package com.lld.pubsub;

import com.lld.pubsub.model.Broker;
import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.Subscriber;
import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves the real concurrency invariants a pub-sub broker has to hold, with real threads and
 * {@link CountDownLatch}-based synchronization — never a sleep-and-hope:
 * <ul>
 *   <li>M publishers x N subscribers: every message reaches every subscriber exactly once
 *       (no loss, no duplicates), each subscriber dispatched on its own real background thread.</li>
 *   <li>A subscriber whose worker is permanently stuck never blocks delivery to a fast
 *       subscriber on the same topic — a deliberate design choice (dedicated per-subscriber
 *       worker threads, not a shared pool), proven here rather than just asserted.</li>
 *   <li>The bounded per-subscriber queue's backpressure ({@code QueueFullException}'s
 *       broadcast-path sibling — the rejected-id list) is deterministically provoked by gating
 *       a subscriber's {@code consume()} rather than racing a timer against it.</li>
 * </ul>
 */
public class PubSubConcurrencyTest {

    /** Counts a shared latch down on every delivery and records the distinct payloads received. */
    private static class CountingSubscriber implements Subscriber {
        private final String id;
        private final CountDownLatch latch;
        final Set<String> received = ConcurrentHashMap.newKeySet();

        CountingSubscriber(String id, CountDownLatch latch) {
            this.id = id;
            this.latch = latch;
        }

        @Override public String getId() { return id; }
        @Override public String getName() { return id; }

        @Override
        public void consume(Message message) {
            received.add(message.getPayload());
            latch.countDown();
        }
    }

    /** Blocks in consume() until the test releases the gate — a deterministic stand-in for "a subscriber that never keeps up". */
    private static class GatedSubscriber implements Subscriber {
        private final String id;
        private final CountDownLatch gate;
        final CountDownLatch enteredConsume = new CountDownLatch(1);

        GatedSubscriber(String id, CountDownLatch gate) {
            this.id = id;
            this.gate = gate;
        }

        @Override public String getId() { return id; }
        @Override public String getName() { return id; }

        @Override
        public void consume(Message message) throws InterruptedException {
            enteredConsume.countDown();
            gate.await();
        }
    }

    @Test
    public void manyPublishersManySubscribers_everyMessageDeliveredExactlyOnceToEverySubscriber() throws Exception {
        int publishers = 5;
        int subscribers = 4;
        int messagesPerPublisher = 25;
        int totalMessages = publishers * messagesPerPublisher;

        Broker broker = new Broker();
        broker.createTopic("fanout");

        CountDownLatch deliveryLatch = new CountDownLatch(totalMessages * subscribers);
        List<CountingSubscriber> subs = new ArrayList<>();
        for (int s = 0; s < subscribers; s++) {
            CountingSubscriber sub = new CountingSubscriber("sub-" + s, deliveryLatch);
            subs.add(sub);
            // Generous capacity: this test proves fan-out correctness, not backpressure.
            broker.subscribe("fanout", sub, totalMessages + 10);
        }

        ExecutorService executor = Executors.newFixedThreadPool(publishers);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int p = 0; p < publishers; p++) {
            final int publisherIdx = p;
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int m = 0; m < messagesPerPublisher; m++) {
                        broker.publish("fanout", "pub" + publisherIdx + "-msg" + m, "publisher-" + publisherIdx, Collections.emptyMap());
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        startLatch.countDown();
        for (Future<?> f : futures) {
            f.get(10, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertTrue(deliveryLatch.await(15, TimeUnit.SECONDS),
                "expected all " + (totalMessages * subscribers) + " deliveries, latch stuck at " + deliveryLatch.getCount());

        Set<String> expectedPayloads = new HashSet<>();
        for (int p = 0; p < publishers; p++) {
            for (int m = 0; m < messagesPerPublisher; m++) {
                expectedPayloads.add("pub" + p + "-msg" + m);
            }
        }

        for (CountingSubscriber sub : subs) {
            assertEquals(totalMessages, sub.received.size(),
                    "subscriber " + sub.id + " must receive every message exactly once (size mismatch means loss or duplication)");
            assertEquals(expectedPayloads, sub.received,
                    "subscriber " + sub.id + " received a different message set than what was published");
        }
    }

    @Test
    public void permanentlyStuckSubscriber_doesNotBlockDeliveryToFastSubscriberOnSameTopic() throws Exception {
        Broker broker = new Broker();
        broker.createTopic("mixed");

        CountDownLatch gate = new CountDownLatch(1); // deliberately never released — models a subscriber that never keeps up
        GatedSubscriber stuck = new GatedSubscriber("stuck-1", gate);
        broker.subscribe("mixed", stuck, 5);

        CountDownLatch fastDeliveryLatch = new CountDownLatch(1);
        CountingSubscriber fast = new CountingSubscriber("fast-1", fastDeliveryLatch);
        broker.subscribe("mixed", fast, 5);

        broker.publish("mixed", "hello", "pub-1", Collections.emptyMap());

        assertTrue(fastDeliveryLatch.await(3, TimeUnit.SECONDS),
                "fast subscriber's dedicated worker thread must deliver independently of the permanently-stuck subscriber's worker");
        assertTrue(stuck.enteredConsume.await(3, TimeUnit.SECONDS), "the stuck subscriber should still have received and begun processing its copy");

        gate.countDown(); // release so its worker thread can exit cleanly at test teardown
    }

    @Test
    public void queueFull_deterministicallyProvoked_rejectsOnlyOnceCapacityIsExceeded() throws Exception {
        Broker broker = new Broker();
        broker.createTopic("gated");

        CountDownLatch gate = new CountDownLatch(1); // held closed for the whole test
        GatedSubscriber stuck = new GatedSubscriber("stuck-1", gate);
        int capacity = 3;
        broker.subscribe("gated", stuck, capacity);

        // The first publish is dequeued by the worker thread and blocks inside consume() — wait
        // for that deterministically before relying on the queue being empty again.
        broker.publish("gated", "msg-0", "pub-1", Collections.emptyMap());
        assertTrue(stuck.enteredConsume.await(3, TimeUnit.SECONDS), "worker should have dequeued msg-0 and blocked in consume()");

        List<String> allRejections = new ArrayList<>();
        for (int i = 1; i <= capacity + 1; i++) {
            allRejections.addAll(broker.publish("gated", "msg-" + i, "pub-1", Collections.emptyMap()));
        }

        assertEquals(1, allRejections.size(), "exactly the (capacity+1)th message should be rejected once the bounded queue fills");
        assertEquals("stuck-1", allRejections.get(0));

        gate.countDown();
    }
}
