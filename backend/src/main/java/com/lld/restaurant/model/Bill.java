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
public class Bill {
    private String id;
    private String orderId;
    private String tableId;
    private double subtotal;
    private double discount;
    private double tax;
    private double serviceCharge;
    private double total;
    private String strategyUsed;
    @Builder.Default
    private boolean paid = false;
    @Builder.Default
    private Instant createdAt = Instant.now();
    private Instant paidAt;
}
