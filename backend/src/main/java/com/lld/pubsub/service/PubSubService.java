package com.lld.pubsub.service;

import com.lld.pubsub.exception.DispatchFailedException;
import com.lld.pubsub.exception.QueueFullException;
import com.lld.pubsub.exception.SubscriberNotFoundException;
import com.lld.pubsub.exception.TopicNotFoundException;
import com.lld.pubsub.model.*;
import com.lld.pubsub.repository.PubSubRepository;
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
    private final PubSubRepository repository;

    // Isolated Simulation Engine State — its own Broker AND its own repository instance, so a
    // replayed demo can never corrupt the live topic/subscriber directory.
    private final Broker simBroker = new Broker();
    private final PubSubRepository simRepository = new PubSubRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public PubSubService(PubSubRepository repository) {
        this.repository = repository;
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

    /** Throws {@code DuplicateSubscriptionException} (via {@code Topic#addSubscriber}) if this
     *  subscriber id is already active on the topic. */
    public void subscribe(String topicName, String subscriberId, String subscriberName, String subscriberType, int capacity, Long delayMs) {
        getTopic(topicName);
        Subscriber subscriber = createSubscriberInstance(subscriberId, subscriberName, subscriberType, delayMs);
        broker.subscribe(topicName, subscriber, capacity <= 0 ? 50 : capacity);
        repository.save(topicName, subscriber);
    }

    /** Throws {@code SubscriberNotFoundException} (via {@code Topic#removeSubscriber}) if this
     *  subscriber id is not currently active on the topic. */
    public void unsubscribe(String topicName, String subscriberId) {
        getTopic(topicName);
        broker.unsubscribe(topicName, subscriberId);
        repository.remove(topicName, subscriberId);
    }

    /** Broadcast fan-out. Never throws for a full subscriber queue — returns the rejected ids so
     *  one slow consumer can't fail delivery to the rest of the topic. */
    public List<String> publish(String topicName, String payload, String publisherId) {
        getTopic(topicName);
        List<String> rejectedSubscribers = broker.publish(topicName, payload, publisherId, Collections.emptyMap());
        if (!rejectedSubscribers.isEmpty()) {
            System.err.println(String.format("Backpressure triggered on topic %s for subscribers: %s", topicName, rejectedSubscribers));
        }
        return rejectedSubscribers;
    }

    /**
     * Strict point-to-point send: throws {@code QueueFullException} (409) if the target
     * subscriber's queue is momentarily full, or {@code DispatchFailedException} (410) if its
     * worker has already stopped — the two ways a direct/retried delivery can fail, distinct
     * from broadcast {@code publish}'s reject-and-continue contract.
     */
    public void publishToSubscriber(String topicName, String subscriberId, String payload, String publisherId) {
        getTopic(topicName);
        broker.publishToSubscriber(topicName, subscriberId, payload, publisherId, Collections.emptyMap());
    }

    public List<Message> getSubscriberMessages(String topicName, String subscriberId) {
        Topic topic = getTopic(topicName);
        if (!topic.hasSubscriber(subscriberId)) {
            throw new SubscriberNotFoundException("Subscriber " + subscriberId + " is not subscribed to topic " + topicName);
        }
        Subscriber sub = repository.find(topicName, subscriberId);
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
        simRepository.clear();
        simEventLog.clear();

        simBroker.createTopic("tech-news");
        simBroker.createTopic("sports-alerts");

        PrintSubscriber fastSub = new PrintSubscriber("sub-fast", "FastPrinter");
        SlowSubscriber slowSub = new SlowSubscriber("sub-slow", "SlowAnalytics Engine", 200L);
        LoggingSubscriber auditSub = new LoggingSubscriber("sub-audit", "AuditLogger");

        simBroker.subscribe("tech-news", fastSub, 10);
        simBroker.subscribe("tech-news", slowSub, 3); // Bounded queue capacity = 3 for slow subscriber
        simBroker.subscribe("sports-alerts", auditSub, 10);

        simRepository.save("tech-news", fastSub);
        simRepository.save("tech-news", slowSub);
        simRepository.save("sports-alerts", auditSub);

        logSimEvent("SIM_RESET", "System", "Initialized 2 simulation topics (tech-news, sports-alerts) & 3 subscribers", null);
    }

    public synchronized List<TopicSnapshot> simCreateTopic(String topicName) {
        simBroker.createTopic(topicName);
        logSimEvent("TOPIC_CREATED", "Admin", "Created simulation topic: " + topicName, Map.of("topicName", topicName));
        return captureSimSnapshots();
    }

    public synchronized List<TopicSnapshot> simSubscribe(String topicName, String subscriberId, String subscriberName, String type, int capacity, Long delayMs) {
        Subscriber subscriber = createSubscriberInstance(subscriberId, subscriberName, type, delayMs);
        simBroker.subscribe(topicName, subscriber, capacity);
        simRepository.save(topicName, subscriber);

        Map<String, Object> details = new HashMap<>();
        details.put("topicName", topicName);
        details.put("subscriberId", subscriberId);
        details.put("capacity", capacity);

        logSimEvent("SUBSCRIBE", subscriberName, "Subscribed to " + topicName + " (capacity=" + capacity + ")", details);
        return captureSimSnapshots();
    }

    public synchronized List<TopicSnapshot> simUnsubscribe(String topicName, String subscriberId) {
        simBroker.unsubscribe(topicName, subscriberId);
        simRepository.remove(topicName, subscriberId);
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

    /**
     * Strict single-target send against the sim sandbox, for the simulation tab's "direct send"
     * step. Unlike the real {@code publishToSubscriber}, this never lets the exception escape to
     * the HTTP layer — it catches each of the three ways a direct send can fail and logs a
     * distinct, inspectable sim event instead, so the demo can show QueueFullException /
     * DispatchFailedException / SubscriberNotFoundException actually firing without the frontend
     * having to special-case an error response for what is otherwise a uniform snapshot-returning
     * sim endpoint.
     */
    public synchronized List<TopicSnapshot> simPublishToSubscriber(String topicName, String subscriberId, String payload, String publisherId) {
        Map<String, Object> details = new HashMap<>();
        details.put("topicName", topicName);
        details.put("subscriberId", subscriberId);
        details.put("payload", payload);
        details.put("publisherId", publisherId);

        try {
            simBroker.publishToSubscriber(topicName, subscriberId, payload, publisherId, Collections.emptyMap());
            logSimEvent("DIRECT_SEND", publisherId, "Direct send '" + payload + "' to " + subscriberId + " on " + topicName + " — delivered", details);
        } catch (QueueFullException e) {
            details.put("reason", "QUEUE_FULL (409)");
            logSimEvent("DIRECT_SEND_REJECTED", publisherId, "DIRECT SEND FAILED — " + e.getMessage(), details);
        } catch (DispatchFailedException e) {
            details.put("reason", "WORKER_STOPPED (410)");
            logSimEvent("DIRECT_SEND_REJECTED", publisherId, "DIRECT SEND FAILED — " + e.getMessage(), details);
        } catch (SubscriberNotFoundException e) {
            details.put("reason", "NOT_FOUND (404)");
            logSimEvent("DIRECT_SEND_REJECTED", publisherId, "DIRECT SEND FAILED — " + e.getMessage(), details);
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
                subSnapshots.add(SubscriberSnapshot.builder()
                        .id(sub.getId())
                        .name(sub.getName())
                        .type(type)
                        .queueSize(w.getQueueSize())
                        .queueCapacity(w.getQueueCapacity())
                        .deliveredCount(w.getDeliveredCount())
                        .rejectedCount(w.getRejectedCount())
                        .build());
            }
            topicSnapshots.add(TopicSnapshot.builder()
                    .name(t.getName())
                    .publishedCount(t.getPublishedCount())
                    .subscribers(subSnapshots)
                    .build());
        }
        return topicSnapshots;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(ts)
                .type(type)
                .actor(actor)
                .description(desc)
                .details(data)
                .topicSnapshots(captureSimSnapshots())
                .build();
        simEventLog.add(event);
    }
}
