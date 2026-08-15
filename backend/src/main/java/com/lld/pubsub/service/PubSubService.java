package com.lld.pubsub.service;

import com.lld.pubsub.exception.TopicNotFoundException;
import com.lld.pubsub.model.*;
import com.lld.pubsub.worker.SubscriberWorker;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PubSubService {

    private final Broker broker = new Broker();
    private final Map<String, Subscriber> activeSubscribers = new HashMap<>();

    // Isolated Simulation Engine State
    private final Broker simBroker = new Broker();
    private final Map<String, Subscriber> simActiveSubscribers = new HashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public PubSubService() {
        initSimState();
    }

    public Topic createTopic(String name) {
        broker.createTopic(name);
        return broker.getTopic(name);
    }

    public List<Topic> getTopics() {
        return broker.getAllTopics();
    }

    public Topic getTopic(String name) {
        Topic topic = broker.getTopic(name);
        if (topic == null) {
            throw new TopicNotFoundException("Topic not found: " + name);
        }
        return topic;
    }

    public void subscribe(String topicName, String subscriberId, String subscriberName, String subscriberType, int capacity, Long delayMs) {
        Topic topic = getTopic(topicName);
        Subscriber subscriber = createSubscriberInstance(subscriberId, subscriberName, subscriberType, delayMs);
        activeSubscribers.put(subscriberId, subscriber);
        broker.subscribe(topicName, subscriber, capacity <= 0 ? 50 : capacity);
    }

    public void unsubscribe(String topicName, String subscriberId) {
        getTopic(topicName); // Ensures topic exists
        broker.unsubscribe(topicName, subscriberId);
    }

    public List<String> publish(String topicName, String payload, String publisherId) {
        getTopic(topicName);
        List<String> rejectedSubscribers = broker.publish(topicName, payload, publisherId, Collections.emptyMap());
        if (!rejectedSubscribers.isEmpty()) {
            System.err.println(String.format("Backpressure triggered on topic %s for subscribers: %s", topicName, rejectedSubscribers));
        }
        return rejectedSubscribers;
    }

    public List<Message> getSubscriberMessages(String topicName, String subscriberId) {
        Subscriber sub = activeSubscribers.get(subscriberId);
        if (sub instanceof PrintSubscriber) {
            return ((PrintSubscriber) sub).getReceivedMessages();
        } else if (sub instanceof SlowSubscriber) {
            return ((SlowSubscriber) sub).getReceivedMessages();
        }
        return Collections.emptyList();
    }

    private Subscriber createSubscriberInstance(String id, String name, String type, Long delayMs) {
        if ("SLOW".equalsIgnoreCase(type)) {
            long delay = delayMs != null ? delayMs : 300L;
            return new SlowSubscriber(id, name, delay);
        } else if ("LOGGING".equalsIgnoreCase(type)) {
            return new LoggingSubscriber(id, name);
        }
        return new PrintSubscriber(id, name);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized void initSimState() {
        simBroker.shutdown();
        simActiveSubscribers.clear();
        simEventLog.clear();

        simBroker.createTopic("tech-news");
        simBroker.createTopic("sports-alerts");

        PrintSubscriber fastSub = new PrintSubscriber("sub-fast", "FastPrinter");
        SlowSubscriber slowSub = new SlowSubscriber("sub-slow", "SlowAnalytics Engine", 200L);
        LoggingSubscriber auditSub = new LoggingSubscriber("sub-audit", "AuditLogger");

        simActiveSubscribers.put(fastSub.getId(), fastSub);
        simActiveSubscribers.put(slowSub.getId(), slowSub);
        simActiveSubscribers.put(auditSub.getId(), auditSub);

        simBroker.subscribe("tech-news", fastSub, 10);
        simBroker.subscribe("tech-news", slowSub, 3); // Bounded queue capacity = 3 for slow subscriber
        simBroker.subscribe("sports-alerts", auditSub, 10);

        logSimEvent("SIM_RESET", "System", "Initialized 2 simulation topics (tech-news, sports-alerts) & 3 subscribers", null);
    }

    public synchronized List<TopicSnapshot> simCreateTopic(String topicName) {
        simBroker.createTopic(topicName);
        logSimEvent("TOPIC_CREATED", "Admin", "Created simulation topic: " + topicName, Map.of("topicName", topicName));
        return captureSimSnapshots();
    }

    public synchronized List<TopicSnapshot> simSubscribe(String topicName, String subscriberId, String subscriberName, String type, int capacity, Long delayMs) {
        Subscriber subscriber = createSubscriberInstance(subscriberId, subscriberName, type, delayMs);
        simActiveSubscribers.put(subscriberId, subscriber);
        simBroker.subscribe(topicName, subscriber, capacity);

        Map<String, Object> details = new HashMap<>();
        details.put("topicName", topicName);
        details.put("subscriberId", subscriberId);
        details.put("capacity", capacity);

        logSimEvent("SUBSCRIBE", subscriberName, "Subscribed to " + topicName + " (capacity=" + capacity + ")", details);
        return captureSimSnapshots();
    }

    public synchronized List<TopicSnapshot> simUnsubscribe(String topicName, String subscriberId) {
        simBroker.unsubscribe(topicName, subscriberId);
        logSimEvent("UNSUBSCRIBE", subscriberId, "Unsubscribed from topic " + topicName, Map.of("topicName", topicName, "subscriberId", subscriberId));
        return captureSimSnapshots();
    }

    public synchronized List<TopicSnapshot> simPublish(String topicName, String payload, String publisherId) {
        List<String> rejected = simBroker.publish(topicName, payload, publisherId, Collections.emptyMap());

        Map<String, Object> details = new HashMap<>();
        details.put("topicName", topicName);
        details.put("payload", payload);
        details.put("publisherId", publisherId);

        if (!rejected.isEmpty()) {
            details.put("rejectedSubscribers", rejected);
            logSimEvent("BACKPRESSURE_REJECT", publisherId, "QUEUE FULL! Rejected message on " + topicName + " for slow subscribers: " + rejected, details);
        } else {
            logSimEvent("PUBLISH", publisherId, "Published message '" + payload + "' to " + topicName, details);
        }

        return captureSimSnapshots();
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public List<TopicSnapshot> getSimSnapshots() {
        return captureSimSnapshots();
    }

    private List<TopicSnapshot> captureSimSnapshots() {
        List<TopicSnapshot> topicSnapshots = new ArrayList<>();
        for (Topic t : simBroker.getAllTopics()) {
            List<SubscriberSnapshot> subSnapshots = new ArrayList<>();
            for (SubscriberWorker w : t.getWorkers()) {
                Subscriber sub = w.getSubscriber();
                String type = sub instanceof SlowSubscriber ? "SLOW" : (sub instanceof LoggingSubscriber ? "LOGGING" : "PRINT");
                subSnapshots.add(new SubscriberSnapshot(
                        sub.getId(), sub.getName(), type,
                        w.getQueueSize(), w.getQueueCapacity(),
                        w.getDeliveredCount(), w.getRejectedCount()
                ));
            }
            topicSnapshots.add(new TopicSnapshot(t.getName(), t.getPublishedCount(), subSnapshots));
        }
        return topicSnapshots;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data, captureSimSnapshots());
        simEventLog.add(event);
    }
}
