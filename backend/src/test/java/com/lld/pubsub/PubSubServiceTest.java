package com.lld.pubsub;

import com.lld.pubsub.exception.DispatchFailedException;
import com.lld.pubsub.exception.DuplicateSubscriptionException;
import com.lld.pubsub.exception.QueueFullException;
import com.lld.pubsub.exception.SubscriberNotFoundException;
import com.lld.pubsub.exception.TopicNotFoundException;
import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.Topic;
import com.lld.pubsub.repository.PubSubRepository;
import com.lld.pubsub.service.PubSubService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

public class PubSubServiceTest {

    private PubSubService service;

    @BeforeEach
    public void setUp() {
        service = new PubSubService(new PubSubRepository());
    }

    @Test
    public void testCreateTopicAndSubscribe() {
        Topic topic = service.createTopic("test-topic");
        assertNotNull(topic);
        assertEquals("test-topic", topic.getName());

        service.subscribe("test-topic", "sub-1", "Test Subscriber", "PRINT", 10, 0L);
        assertEquals(1, topic.getWorkers().size());
    }

    @Test
    public void testSinglePublisherDelivery() throws InterruptedException {
        service.createTopic("news");
        service.subscribe("news", "sub-fast", "Fast Sub", "PRINT", 10, 0L);

        service.publish("news", "Hello PubSub", "pub-1");
        Thread.sleep(300);

        List<Message> received = service.getSubscriberMessages("news", "sub-fast");
        assertEquals(1, received.size());
        assertEquals("Hello PubSub", received.get(0).getPayload());
    }

    @Test
    public void testFIFOMessageDeliveryOrderPerSubscriber() throws InterruptedException {
        service.createTopic("ordered-topic");
        service.subscribe("ordered-topic", "sub-order", "Order Checker", "PRINT", 50, 0L);

        int totalMessages = 20;
        for (int i = 1; i <= totalMessages; i++) {
            service.publish("ordered-topic", "Message-" + i, "pub-1");
        }

        Thread.sleep(500);

        List<Message> received = service.getSubscriberMessages("ordered-topic", "sub-order");
        assertEquals(totalMessages, received.size());

        for (int i = 0; i < totalMessages; i++) {
            assertEquals("Message-" + (i + 1), received.get(i).getPayload(), "Message at index " + i + " was out of order!");
        }
    }

    @Test
    public void testBackpressureRejectionOnFullQueue() throws InterruptedException {
        service.createTopic("overflow-topic");
        // Capacity = 2, delay = 200ms
        service.subscribe("overflow-topic", "sub-slow", "Slow Analytics", "SLOW", 2, 200L);

        // Send 10 rapid messages to overflow the queue of capacity 2
        List<String> allRejected = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            List<String> rej = service.publish("overflow-topic", "Burst-" + i, "pub-burst");
            if (rej != null) {
                allRejected.addAll(rej);
            }
        }

        assertFalse(allRejected.isEmpty(), "Expected backpressure rejection on full queue!");
        assertTrue(allRejected.contains("sub-slow"));
    }

    @Test
    public void testUnsubscribeMidStreamNoCrash() throws InterruptedException {
        service.createTopic("unsub-topic");
        service.subscribe("unsub-topic", "sub-temp", "Temp Sub", "PRINT", 10, 0L);

        service.publish("unsub-topic", "Msg Before Unsub", "pub-1");
        service.unsubscribe("unsub-topic", "sub-temp");
        service.publish("unsub-topic", "Msg After Unsub", "pub-1");

        Thread.sleep(300);
        Topic topic = service.getTopic("unsub-topic");
        assertEquals(0, topic.getWorkers().size());
    }

    // ------------------------------------------------------------------
    // Typed exception hierarchy: every case is a real, provokable failure.
    // ------------------------------------------------------------------

    @Test
    public void publish_toUnknownTopic_throwsTopicNotFoundException() {
        assertThrows(TopicNotFoundException.class, () -> service.publish("no-such-topic", "hi", "pub-1"));
    }

    @Test
    public void subscribe_toUnknownTopic_throwsTopicNotFoundException() {
        assertThrows(TopicNotFoundException.class,
                () -> service.subscribe("no-such-topic", "sub-1", "S1", "PRINT", 10, 0L));
    }

    @Test
    public void subscribe_sameIdTwiceOnSameTopic_throwsDuplicateSubscriptionException() {
        service.createTopic("dup-topic");
        service.subscribe("dup-topic", "sub-1", "S1", "PRINT", 10, 0L);

        assertThrows(DuplicateSubscriptionException.class,
                () -> service.subscribe("dup-topic", "sub-1", "S1 Again", "PRINT", 20, 0L));

        // The original worker must be untouched by the rejected duplicate attempt.
        assertEquals(1, service.getTopic("dup-topic").getWorkers().size());
    }

    @Test
    public void subscribe_sameIdOnTwoDifferentTopics_isAllowed_andHistoryIsKeptSeparate() throws InterruptedException {
        service.createTopic("topic-a");
        service.createTopic("topic-b");
        service.subscribe("topic-a", "sub-1", "S1", "PRINT", 10, 0L);
        service.subscribe("topic-b", "sub-1", "S1", "PRINT", 10, 0L);

        service.publish("topic-a", "only-on-a", "pub-1");
        service.publish("topic-b", "only-on-b", "pub-1");
        Thread.sleep(300);

        List<Message> onA = service.getSubscriberMessages("topic-a", "sub-1");
        List<Message> onB = service.getSubscriberMessages("topic-b", "sub-1");

        assertEquals(1, onA.size());
        assertEquals("only-on-a", onA.get(0).getPayload());
        assertEquals(1, onB.size());
        assertEquals("only-on-b", onB.get(0).getPayload());
    }

    @Test
    public void unsubscribe_unknownSubscriber_throwsSubscriberNotFoundException() {
        service.createTopic("t1");
        assertThrows(SubscriberNotFoundException.class, () -> service.unsubscribe("t1", "ghost"));
    }

    @Test
    public void unsubscribe_thenUnsubscribeAgain_throwsSubscriberNotFoundException() {
        service.createTopic("t2");
        service.subscribe("t2", "sub-1", "S1", "PRINT", 10, 0L);
        service.unsubscribe("t2", "sub-1");

        assertThrows(SubscriberNotFoundException.class, () -> service.unsubscribe("t2", "sub-1"));
    }

    @Test
    public void getSubscriberMessages_unknownSubscriber_throwsSubscriberNotFoundException() {
        service.createTopic("t3");
        assertThrows(SubscriberNotFoundException.class, () -> service.getSubscriberMessages("t3", "ghost"));
    }

    @Test
    public void getSubscriberMessages_subscriberOfADifferentTopic_throwsSubscriberNotFoundException() {
        service.createTopic("t4a");
        service.createTopic("t4b");
        service.subscribe("t4a", "sub-1", "S1", "PRINT", 10, 0L);

        // sub-1 is real, just not on t4b — must not leak t4a's history through the wrong topic.
        assertThrows(SubscriberNotFoundException.class, () -> service.getSubscriberMessages("t4b", "sub-1"));
    }

    @Test
    public void publishToSubscriber_whenQueueFull_throwsQueueFullExceptionWithoutAffectingOtherSubscribers() throws InterruptedException {
        service.createTopic("direct-topic");
        service.subscribe("direct-topic", "sub-slow", "Slow", "SLOW", 1, 5_000L);
        service.subscribe("direct-topic", "sub-fast", "Fast", "PRINT", 10, 0L);

        // First direct send is picked up by the slow worker and blocks there for 5s, leaving the
        // capacity=1 queue empty again. Poll for that deterministically (queue size back to 0)
        // instead of a fixed sleep-and-hope, since a busy CI host can make "quick" dequeues slow.
        service.publishToSubscriber("direct-topic", "sub-slow", "first", "pub-1");
        awaitQueueSize(service, "direct-topic", "sub-slow", 0, 3, TimeUnit.SECONDS);

        // Second send fills the now-empty capacity=1 queue.
        service.publishToSubscriber("direct-topic", "sub-slow", "second", "pub-1");

        // Third send finds a full queue.
        assertThrows(QueueFullException.class,
                () -> service.publishToSubscriber("direct-topic", "sub-slow", "third", "pub-1"));

        // sub-fast is unaffected by sub-slow's saturated queue.
        assertDoesNotThrow(() -> service.publishToSubscriber("direct-topic", "sub-fast", "hi", "pub-1"));
    }

    @Test
    public void publishToSubscriber_unknownSubscriber_throwsSubscriberNotFoundException() {
        service.createTopic("direct-topic-2");
        assertThrows(SubscriberNotFoundException.class,
                () -> service.publishToSubscriber("direct-topic-2", "ghost", "hi", "pub-1"));
    }

    @Test
    public void publishToSubscriber_unknownTopic_throwsTopicNotFoundException() {
        assertThrows(TopicNotFoundException.class,
                () -> service.publishToSubscriber("no-such-topic", "sub-1", "hi", "pub-1"));
    }

    /** Bounded, deterministic poll for a subscriber's queue to reach a target size — used instead
     *  of a fixed sleep to wait for "the worker has dequeued into its slow consume()", since how
     *  long that takes depends on host load, not a knowable constant. */
    private static void awaitQueueSize(PubSubService service, String topicName, String subscriberId, int target, long timeout, TimeUnit unit) throws InterruptedException {
        long deadlineNanos = System.nanoTime() + unit.toNanos(timeout);
        while (System.nanoTime() < deadlineNanos) {
            for (var worker : service.getTopic(topicName).getWorkers()) {
                if (worker.getSubscriber().getId().equals(subscriberId) && worker.getQueueSize() == target) {
                    return;
                }
            }
            Thread.sleep(5);
        }
        throw new AssertionError("subscriber " + subscriberId + " on " + topicName + " never reached queue size " + target + " within " + timeout + " " + unit);
    }
}
