package com.lld.pubsub.repository;

import com.lld.pubsub.model.*;
import org.springframework.stereotype.Repository;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class PubSubRepository {
    private final Map<String, Topic> topics = new ConcurrentHashMap<>();
    private final Map<String, Subscriber> subscribers = new ConcurrentHashMap<>();

    public void saveTopic(Topic topic) { topics.put(topic.getName(), topic); }
    public Topic findTopic(String name) { return topics.get(name); }
    public Map<String, Topic> findAllTopics() { return topics; }
    public void saveSubscriber(Subscriber sub) { subscribers.put(sub.getId(), sub); }
    public Subscriber findSubscriber(String id) { return subscribers.get(id); }
    public Map<String, Subscriber> findAllSubscribers() { return subscribers; }
}
