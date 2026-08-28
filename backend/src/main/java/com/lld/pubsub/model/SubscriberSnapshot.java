package com.lld.pubsub.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Read-only telemetry projection of one {@code SubscriberWorker} for the sim HUD. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriberSnapshot {
    private String id;
    private String name;
    private String type;
    private int queueSize;
    private int queueCapacity;
    private long deliveredCount;
    private long rejectedCount;
}
