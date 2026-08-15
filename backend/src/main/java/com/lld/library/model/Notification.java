package com.lld.library.model;

import com.lld.library.enums.NotificationType;

import java.time.Instant;
import java.util.UUID;

public class Notification {
    private final String id;
    private final String memberId;
    private final NotificationType type;
    private final String message;
    private final String referenceId;
    private final Instant timestamp;

    public Notification(String memberId, NotificationType type, String message, String referenceId) {
        this.id = UUID.randomUUID().toString();
        this.memberId = memberId;
        this.type = type;
        this.message = message != null ? message : "";
        this.referenceId = referenceId != null ? referenceId : "";
        this.timestamp = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getMemberId() {
        return memberId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getMessage() {
        return message;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
