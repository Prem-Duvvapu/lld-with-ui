package com.lld.zomato.model;

import java.time.LocalDateTime;

public class Notification {
    private String id;
    private String recipientType; // CUSTOMER, RESTAURANT, AGENT
    private String recipientId;
    private String orderId;
    private String message;
    private LocalDateTime timestamp;

    public Notification() {}

    public Notification(String id, String recipientType, String recipientId, String orderId, String message) {
        this.id = id;
        this.recipientType = recipientType;
        this.recipientId = recipientId;
        this.orderId = orderId;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    public String getId() { return id; }
    public String getRecipientType() { return recipientType; }
    public String getRecipientId() { return recipientId; }
    public String getOrderId() { return orderId; }
    public String getMessage() { return message; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
