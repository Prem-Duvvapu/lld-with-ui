package com.lld.learning.examples;

import java.util.ArrayList;
import java.util.List;

/** Deliberately unsafe counterexample: callers can bypass addTopic's validation. */
public final class LeakyShelf {
    public final List<String> topics = new ArrayList<>();

    public void addTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic is required");
        }
        topics.add(topic.trim());
    }
}
