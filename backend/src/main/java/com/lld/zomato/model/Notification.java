package com.lld.zomato.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private String id;
    private String recipientType; // CUSTOMER, RESTAURANT, AGENT
    private String recipientId;
    private String orderId;
    private String message;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    public Notification(String id, String recipientType, String recipientId, String orderId, String message) {
        this.id = id;
        this.recipientType = recipientType;
        this.recipientId = recipientId;
        this.orderId = orderId;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
}
