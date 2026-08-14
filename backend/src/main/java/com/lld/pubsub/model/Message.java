package com.lld.pubsub.model;

import java.util.Collections;
import java.util.Map;

public class Message {
    private final String id;
    private final String topicName;
    private final String payload;
    private final String publisherId;
    private final long timestampEpoch;
    private final Map<String, String> headers;

    public Message(String id, String topicName, String payload, String publisherId, Map<String, String> headers) {
        this.id = id;
        this.topicName = topicName;
        this.payload = payload;
        this.publisherId = publisherId;
        this.timestampEpoch = System.currentTimeMillis();
        this.headers = headers != null ? headers : Collections.emptyMap();
    }

    public Message(String id, String topicName, String payload, String publisherId) {
        this(id, topicName, payload, publisherId, Collections.emptyMap());
    }

    public String getId() {
        return id;
    }

    public String getTopicName() {
        return topicName;
    }

    public String getPayload() {
        return payload;
    }

    public String getPublisherId() {
        return publisherId;
    }

    public long getTimestampEpoch() {
        return timestampEpoch;
    }

    public Map<String, String> getHeaders() {
        return headers;
    }
}
