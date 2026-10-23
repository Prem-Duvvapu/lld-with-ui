package com.lld.learning.examples;

import java.util.ArrayList;
import java.util.List;

public final class ReadingShelf {
    private final int capacity;
    private final List<String> topics = new ArrayList<>();

    public ReadingShelf(int capacity) {
        if (capacity < 1) {
            throw new IllegalArgumentException("Capacity must be positive");
        }
        this.capacity = capacity;
    }

    public void addTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic is required");
        }
        if (topics.size() == capacity) {
            throw new IllegalStateException("Shelf is full");
        }
        topics.add(topic.trim());
    }

    public int getCapacity() {
        return capacity;
    }

    public List<String> getTopics() {
        return List.copyOf(topics);
    }
}
