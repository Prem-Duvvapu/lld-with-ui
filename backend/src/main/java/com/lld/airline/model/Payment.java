package com.lld.airline.model;

import com.lld.airline.enums.PaymentStatus;
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
    private String paymentId;
    private String bookingId;
    private double amount;
    private String paymentMethod;
    @Builder.Default
    private PaymentStatus status = PaymentStatus.SUCCESS;
    private String idempotencyKey;
    @Builder.Default
    private Instant timestamp = Instant.now();
}
