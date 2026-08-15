package com.lld.airline.model;

import com.lld.airline.enums.PaymentStatus;

import java.time.Instant;
import java.util.UUID;

public class Payment {
    private final String paymentId;
    private final String bookingId;
    private final double amount;
    private final String paymentMethod;
    private final PaymentStatus status;
    private final String idempotencyKey;
    private final Instant timestamp;

    public Payment(String paymentId, String bookingId, double amount, String paymentMethod,
                   PaymentStatus status, String idempotencyKey) {
        this.paymentId = paymentId != null ? paymentId : UUID.randomUUID().toString();
        this.bookingId = bookingId;
        this.amount = amount;
        this.paymentMethod = paymentMethod != null ? paymentMethod : "CARD";
        this.status = status != null ? status : PaymentStatus.SUCCESS;
        this.idempotencyKey = idempotencyKey != null ? idempotencyKey : UUID.randomUUID().toString();
        this.timestamp = Instant.now();
    }

    public String getPaymentId() {
        return paymentId;
    }

    public String getBookingId() {
        return bookingId;
    }

    public double getAmount() {
        return amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
