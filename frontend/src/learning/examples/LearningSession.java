package com.lld.learning.examples;

import java.util.List;
import java.util.Objects;

public class LearningSession {
    private final String topic;

    protected LearningSession(String topic, List<String> trace) {
        Objects.requireNonNull(trace, "trace");
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic is required");
        }
        this.topic = topic.trim();
        trace.add("base topic=" + this.topic);
    }

    public final String getTopic() {
        return topic;
    }
}
