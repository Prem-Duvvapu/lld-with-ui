package com.lld.restaurant.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    private String id;
    private String billId;
    private String orderId;
    private double amount;
    private PaymentMethod method;
    private PaymentStatus status;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
