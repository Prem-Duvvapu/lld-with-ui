package com.lld.pubsub;

import com.lld.pubsub.model.Message;
import com.lld.pubsub.model.Topic;
import com.lld.pubsub.service.PubSubService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class PubSubServiceTest {

    private PubSubService service;

    @BeforeEach
    public void setUp() {
        service = new PubSubService();
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
}
