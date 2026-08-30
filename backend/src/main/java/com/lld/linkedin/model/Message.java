package com.lld.linkedin.model;

import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
public class Message {
    private final String id;
    private final String conversationKey;
    private final String senderId;
    private final String receiverId;
    private final String content;
    private final Instant timestamp;
    private volatile boolean isRead;

    public Message(String senderId, String receiverId, String content) {
        if (senderId == null || receiverId == null || senderId.equals(receiverId)) {
            throw new IllegalArgumentException("Sender and receiver must be distinct and non-null");
        }
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }
        this.id = UUID.randomUUID().toString();
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.conversationKey = senderId.compareTo(receiverId) < 0 ?
                senderId + "#" + receiverId : receiverId + "#" + senderId;
        this.content = content.trim();
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
