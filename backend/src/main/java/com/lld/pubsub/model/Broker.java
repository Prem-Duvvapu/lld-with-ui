package com.lld.pubsub.model;

import com.lld.pubsub.exception.TopicNotFoundException;
import com.lld.pubsub.worker.SubscriberWorker;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class Broker {

    private final ConcurrentHashMap<String, Topic> topics = new ConcurrentHashMap<>();
    private final AtomicLong messageIdGen = new AtomicLong(1);

    public void createTopic(String name) {
        topics.putIfAbsent(name, new Topic(name));
    }

    public Topic getTopic(String name) {
        return topics.get(name);
    }

    public List<Topic> getAllTopics() {
        return new ArrayList<>(topics.values());
    }

    public void subscribe(String topicName, Subscriber subscriber, int queueCapacity) {
        Topic topic = requireTopic(topicName);
        topic.addSubscriber(subscriber, queueCapacity);
    }

    public void unsubscribe(String topicName, String subscriberId) {
        Topic topic = requireTopic(topicName);
        topic.removeSubscriber(subscriberId);
    }

    /** Broadcast fan-out: never throws. Returns the ids of subscribers whose queue was full. */
    public List<String> publish(String topicName, String payload, String publisherId, Map<String, String> headers) {
        Topic topic = requireTopic(topicName);
        Message message = Message.of(nextMessageId(), topicName, payload, publisherId, headers);
        return topic.publish(message);
    }

    /**
     * Strict point-to-point send to exactly one subscriber. Throws {@code QueueFullException}
     * or {@code DispatchFailedException} instead of the broadcast path's rejected-id list.
     */
    public void publishToSubscriber(String topicName, String subscriberId, String payload, String publisherId, Map<String, String> headers) {
        Topic topic = requireTopic(topicName);
        Message message = Message.of(nextMessageId(), topicName, payload, publisherId, headers);
        topic.publishToOne(subscriberId, message);
    }

    private String nextMessageId() {
        return "MSG-" + messageIdGen.getAndIncrement();
    }

    private Topic requireTopic(String name) {
        Topic topic = topics.get(name);
        if (topic == null) {
            throw new TopicNotFoundException("Topic not found: " + name);
        }
        return topic;
    }

    public void shutdown() {
        for (Topic topic : topics.values()) {
            for (SubscriberWorker worker : topic.getWorkers()) {
                worker.stopGracefully();
            }
        }
    }
}
