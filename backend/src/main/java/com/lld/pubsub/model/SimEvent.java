package com.lld.pubsub.model;

import java.util.List;
import java.util.Map;

public class SimEvent {
    private final long id;
    private final String timestamp;
    private final String type;
    private final String actor;
    private final String description;
    private final Map<String, Object> details;
    private final List<TopicSnapshot> topicSnapshots;

    public SimEvent(long id, String timestamp, String type, String actor, String description, Map<String, Object> details, List<TopicSnapshot> topicSnapshots) {
        this.id = id;
        this.timestamp = timestamp;
        this.type = type;
        this.actor = actor;
        this.description = description;
        this.details = details;
        this.topicSnapshots = topicSnapshots;
    }

    public long getId() {
        return id;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public String getType() {
        return type;
    }

    public String getActor() {
        return actor;
    }

    public String getDescription() {
        return description;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public List<TopicSnapshot> getTopicSnapshots() {
        return topicSnapshots;
    }
}
