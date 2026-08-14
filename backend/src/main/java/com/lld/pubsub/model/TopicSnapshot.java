package com.lld.pubsub.model;

import java.util.List;

public class TopicSnapshot {
    private final String name;
    private final long publishedCount;
    private final List<SubscriberSnapshot> subscribers;

    public TopicSnapshot(String name, long publishedCount, List<SubscriberSnapshot> subscribers) {
        this.name = name;
        this.publishedCount = publishedCount;
        this.subscribers = subscribers;
    }

    public String getName() {
        return name;
    }

    public long getPublishedCount() {
        return publishedCount;
    }

    public List<SubscriberSnapshot> getSubscribers() {
        return subscribers;
    }
}
