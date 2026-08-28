package com.lld.pubsub;

import com.lld.pubsub.exception.DispatchFailedException;
import com.lld.pubsub.exception.QueueFullException;
import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.Subscriber;
import com.lld.pubsub.worker.SubscriberWorker;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit-level coverage of {@link SubscriberWorker} in isolation: proves it is a real background
 * thread (not just a class name), that its bounded queue genuinely backs off under pressure, and
 * that its two failure modes ({@link QueueFullException} vs {@link DispatchFailedException}) are
 * both real and provokable through {@code enqueueOrThrow}, not dead code.
 */
public class SubscriberWorkerTest {

    /** Records every delivered message and counts a latch down per delivery. */
    private static class RecordingSubscriber implements Subscriber {
        private final List<Message> received = new CopyOnWriteArrayList<>();
        private final CountDownLatch deliveryLatch;

        RecordingSubscriber(int expectedDeliveries) {
            this.deliveryLatch = new CountDownLatch(expectedDeliveries);
        }

        @Override public String getId() { return "recorder"; }
        @Override public String getName() { return "Recorder"; }

        @Override
        public void consume(Message message) {
            received.add(message);
            deliveryLatch.countDown();
        }
    }

    /** Blocks in consume() until the test releases the gate — deterministic saturation, no sleeps. */
    private static class GatedSubscriber implements Subscriber {
        private final CountDownLatch gate;
        final CountDownLatch enteredConsume = new CountDownLatch(1);

        GatedSubscriber(CountDownLatch gate) {
            this.gate = gate;
        }

        @Override public String getId() { return "gated"; }
        @Override public String getName() { return "Gated"; }

        @Override
        public void consume(Message message) throws InterruptedException {
            enteredConsume.countDown();
            gate.await();
        }
    }

    @Test
    public void runsOnARealBackgroundThread_notTheCallingThread() throws Exception {
        CountDownLatch threadNameLatch = new CountDownLatch(1);
        String[] observedThreadName = new String[1];
        Subscriber threadObservingSubscriber = new Subscriber() {
            @Override public String getId() { return "observer"; }
            @Override public String getName() { return "Observer"; }
            @Override public void consume(Message message) {
                observedThreadName[0] = Thread.currentThread().getName();
                threadNameLatch.countDown();
            }
        };

        SubscriberWorker worker = new SubscriberWorker(threadObservingSubscriber, 5);
        try {
            String callingThreadName = Thread.currentThread().getName();
            assertTrue(worker.enqueue(Message.of("m1", "t", "hi", "pub", null)));
            assertTrue(threadNameLatch.await(2, TimeUnit.SECONDS), "delivery should happen on the worker's own thread");
            assertNotEquals(callingThreadName, observedThreadName[0],
                    "consume() ran on the calling thread — SubscriberWorker is not actually dispatching asynchronously");
            assertTrue(observedThreadName[0].startsWith("SubscriberWorker-"));
        } finally {
            worker.stopGracefully();
        }
    }

    @Test
    public void deliversEveryEnqueuedMessageInFIFOOrder() throws Exception {
        int count = 25;
        RecordingSubscriber recorder = new RecordingSubscriber(count);
        SubscriberWorker worker = new SubscriberWorker(recorder, 50);
        try {
            for (int i = 0; i < count; i++) {
                assertTrue(worker.enqueue(Message.of("m" + i, "t", "payload-" + i, "pub", null)));
            }
            assertTrue(recorder.deliveryLatch.await(3, TimeUnit.SECONDS));
            assertEquals(count, recorder.received.size());
            for (int i = 0; i < count; i++) {
                assertEquals("payload-" + i, recorder.received.get(i).getPayload(), "message " + i + " arrived out of FIFO order");
            }
            // deliveredCount++ runs on the worker thread just AFTER consume() returns — i.e. after
            // the delivery latch (counted down INSIDE consume()) has already released this thread.
            // received.size() is safe to check immediately (happens-before the countDown that woke
            // us), but the very last increment of this separate counter can still be in flight —
            // so poll it briefly instead of asserting on it as if the latch also covered it.
            awaitCondition(() -> worker.getDeliveredCount() == count, 2, TimeUnit.SECONDS);
            assertEquals(count, worker.getDeliveredCount());
            assertEquals(0, worker.getRejectedCount());
        } finally {
            worker.stopGracefully();
        }
    }

    @Test
    public void enqueue_returnsFalseAndCountsRejection_whenBoundedQueueIsFull() throws Exception {
        CountDownLatch gate = new CountDownLatch(1);
        GatedSubscriber gated = new GatedSubscriber(gate);
        SubscriberWorker worker = new SubscriberWorker(gated, 2);
        try {
            assertTrue(worker.enqueue(Message.of("m0", "t", "p0", "pub", null)));
            assertTrue(gated.enteredConsume.await(2, TimeUnit.SECONDS), "worker should have dequeued m0 and blocked in consume()");

            // Queue is now empty again (m0 was dequeued into consume()); fill it to capacity=2.
            assertTrue(worker.enqueue(Message.of("m1", "t", "p1", "pub", null)));
            assertTrue(worker.enqueue(Message.of("m2", "t", "p2", "pub", null)));
            assertEquals(2, worker.getQueueSize());

            // Third message finds a full queue and is rejected, not delivered.
            assertFalse(worker.enqueue(Message.of("m3", "t", "p3", "pub", null)));
            assertEquals(1, worker.getRejectedCount());
        } finally {
            gate.countDown();
            worker.stopGracefully();
        }
    }

    @Test
    public void enqueueOrThrow_throwsQueueFullException_whenBoundedQueueIsFull() throws Exception {
        CountDownLatch gate = new CountDownLatch(1);
        GatedSubscriber gated = new GatedSubscriber(gate);
        SubscriberWorker worker = new SubscriberWorker(gated, 1);
        try {
            worker.enqueueOrThrow(Message.of("m0", "t", "p0", "pub", null));
            assertTrue(gated.enteredConsume.await(2, TimeUnit.SECONDS));
            worker.enqueueOrThrow(Message.of("m1", "t", "p1", "pub", null)); // fills the capacity=1 queue

            QueueFullException ex = assertThrows(QueueFullException.class,
                    () -> worker.enqueueOrThrow(Message.of("m2", "t", "p2", "pub", null)));
            assertTrue(ex.getMessage().contains("gated"));
        } finally {
            gate.countDown();
            worker.stopGracefully();
        }
    }

    @Test
    public void enqueueOrThrow_throwsDispatchFailedException_onceWorkerHasStopped() {
        RecordingSubscriber recorder = new RecordingSubscriber(0);
        SubscriberWorker worker = new SubscriberWorker(recorder, 5);
        worker.stopGracefully();

        assertThrows(DispatchFailedException.class,
                () -> worker.enqueueOrThrow(Message.of("m0", "t", "p0", "pub", null)));
        assertFalse(worker.isRunning());
    }

    @Test
    public void stopGracefully_drainsAlreadyEnqueuedMessagesBeforeExiting() throws Exception {
        int count = 5;
        RecordingSubscriber recorder = new RecordingSubscriber(count);
        SubscriberWorker worker = new SubscriberWorker(recorder, 10);
        for (int i = 0; i < count; i++) {
            worker.enqueue(Message.of("m" + i, "t", "p" + i, "pub", null));
        }
        worker.stopGracefully(); // running=false, but run()'s loop condition keeps draining while queue is non-empty
        assertTrue(recorder.deliveryLatch.await(3, TimeUnit.SECONDS),
                "a graceful stop should still deliver everything already queued, not drop it");
        assertEquals(count, recorder.received.size());
    }

    /** Bounded condition poll — for the rare case a plain counter's visibility trails a latch
     *  release by one worker-thread statement, never used as the primary synchronization. */
    private static void awaitCondition(java.util.function.BooleanSupplier condition, long timeout, TimeUnit unit) throws InterruptedException {
        long deadlineNanos = System.nanoTime() + unit.toNanos(timeout);
        while (!condition.getAsBoolean() && System.nanoTime() < deadlineNanos) {
            Thread.sleep(5);
        }
    }
}
