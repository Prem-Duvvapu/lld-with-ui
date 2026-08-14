package com.lld.pubsub.model;

public class SubscriberSnapshot {
    private final String id;
    private final String name;
    private final String type;
    private final int queueSize;
    private final int queueCapacity;
    private final long deliveredCount;
    private final long rejectedCount;

    public SubscriberSnapshot(String id, String name, String type, int queueSize, int queueCapacity, long deliveredCount, long rejectedCount) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.queueSize = queueSize;
        this.queueCapacity = queueCapacity;
        this.deliveredCount = deliveredCount;
        this.rejectedCount = rejectedCount;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public int getQueueSize() {
        return queueSize;
    }

    public int getQueueCapacity() {
        return queueCapacity;
    }

    public long getDeliveredCount() {
        return deliveredCount;
    }

    public long getRejectedCount() {
        return rejectedCount;
    }
}
