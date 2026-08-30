package com.lld.linkedin.model;

import com.lld.linkedin.enums.NotificationType;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
public class Notification {
    private final String id;
    private final String recipientId;
    private final String actorId;
    private final NotificationType type;
    private final String message;
    private final String referenceId;
    private final Instant timestamp;
    private volatile boolean isRead;

    public Notification(String recipientId, String actorId, NotificationType type, String message, String referenceId) {
        if (recipientId == null) {
            throw new IllegalArgumentException("Recipient ID cannot be null");
        }
        if (type == null) {
            throw new IllegalArgumentException("Notification type cannot be null");
        }
        this.id = UUID.randomUUID().toString();
        this.recipientId = recipientId;
        this.actorId = actorId != null ? actorId : "SYSTEM";
        this.type = type;
        this.message = message != null ? message : "";
        this.referenceId = referenceId != null ? referenceId : "";
        this.timestamp = Instant.now();
        this.isRead = false;
    }

    public boolean isRead() {
        return isRead;
    }

    public void markAsRead() {
        this.isRead = true;
    }
}
