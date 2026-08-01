package com.lld.uber.payment;

import java.time.LocalDateTime;

public class Payment {
    private String id;
    private String tripId;
    private double amount;
    private String method; // UPI, CARD, CASH
    private PaymentStatus status;
    private LocalDateTime timestamp;

    public Payment() {}

    public Payment(String id, String tripId, double amount, String method) {
        this.id = id;
        this.tripId = tripId;
        this.amount = amount;
        this.method = method;
        this.status = PaymentStatus.PENDING;
        this.timestamp = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTripId() { return tripId; }
    public void setTripId(String tripId) { this.tripId = tripId; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
