package com.lld.pubsub.repository;

import com.lld.pubsub.model.Subscriber;
import com.lld.pubsub.model.Topic;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class PubSubRepository {

    private final ConcurrentHashMap<String, Topic> topics = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Subscriber> subscribers = new ConcurrentHashMap<>();

    public void createTopic(Topic topic) {
        topics.put(topic.getName(), topic);
    }

    public Topic getTopic(String name) {
        return topics.get(name);
    }

    public List<Topic> getAllTopics() {
        return new ArrayList<>(topics.values());
    }

    public void createSubscriber(Subscriber subscriber) {
        subscribers.put(subscriber.getId(), subscriber);
    }

    public Subscriber getSubscriber(String id) {
        return subscribers.get(id);
    }

    public List<Subscriber> getAllSubscribers() {
        return new ArrayList<>(subscribers.values());
    }

    public void deleteTopic(String name) {
        topics.remove(name);
    }
}
