package com.lld.pubsub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.Map;

/** Immutable-in-spirit value carrier — no invariants beyond "has an id and a topic", so Lombok. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    private String id;
    private String topicName;
    private String payload;
    private String publisherId;
    @Builder.Default
    private long timestampEpoch = System.currentTimeMillis();
    @Builder.Default
    private Map<String, String> headers = Collections.emptyMap();

    /** Builds a message stamped with the current time, defaulting a null headers map to empty. */
    public static Message of(String id, String topicName, String payload, String publisherId, Map<String, String> headers) {
        return Message.builder()
                .id(id)
                .topicName(topicName)
                .payload(payload)
                .publisherId(publisherId)
                .headers(headers != null ? headers : Collections.emptyMap())
                .build();
    }
}
