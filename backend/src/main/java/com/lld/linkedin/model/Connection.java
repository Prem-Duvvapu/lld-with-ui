package com.lld.linkedin.model;

import com.lld.linkedin.enums.ConnectionStatus;

import java.time.Instant;
import java.util.UUID;

public class Connection {
    private final String id;
    private final String requesterId;
    private final String targetId;
    private volatile ConnectionStatus status;
    private final Instant createdAt;
    private volatile Instant updatedAt;

    public Connection(String requesterId, String targetId) {
        if (requesterId == null || targetId == null || requesterId.equals(targetId)) {
            throw new IllegalArgumentException("Requester and Target must be distinct and non-null");
        }
        this.id = UUID.randomUUID().toString();
        this.requesterId = requesterId;
        this.targetId = targetId;
        this.status = ConnectionStatus.PENDING;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getRequesterId() {
        return requesterId;
    }

    public String getTargetId() {
        return targetId;
    }

    public ConnectionStatus getStatus() {
        return status;
    }

    public void setStatus(ConnectionStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean involves(String userId) {
        return requesterId.equals(userId) || targetId.equals(userId);
    }

    public String getOtherUser(String userId) {
        if (userId.equals(requesterId)) return targetId;
        if (userId.equals(targetId)) return requesterId;
        throw new IllegalArgumentException("User " + userId + " is not involved in connection " + id);
    }
}
