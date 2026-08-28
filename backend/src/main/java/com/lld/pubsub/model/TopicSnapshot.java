package com.lld.pubsub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Read-only telemetry projection of one {@code Topic} for the sim HUD. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicSnapshot {
    private String name;
    private long publishedCount;
    private List<SubscriberSnapshot> subscribers;
}
