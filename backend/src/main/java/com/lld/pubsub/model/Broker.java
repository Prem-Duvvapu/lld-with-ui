package com.lld.pubsub.model;

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
        Topic topic = topics.get(topicName);
        if (topic != null) {
            topic.addSubscriber(subscriber, queueCapacity);
        }
    }

    public void unsubscribe(String topicName, String subscriberId) {
        Topic topic = topics.get(topicName);
        if (topic != null) {
            topic.removeSubscriber(subscriberId);
        }
    }

    public List<String> publish(String topicName, String payload, String publisherId, Map<String, String> headers) {
        Topic topic = topics.get(topicName);
        if (topic == null) {
            return Collections.emptyList();
        }

        String msgId = "MSG-" + messageIdGen.getAndIncrement();
        Message message = new Message(msgId, topicName, payload, publisherId, headers);
        return topic.publish(message);
    }

    public void shutdown() {
        for (Topic topic : topics.values()) {
            for (SubscriberWorker worker : topic.getWorkers()) {
                worker.stopGracefully();
            }
        }
    }
}
