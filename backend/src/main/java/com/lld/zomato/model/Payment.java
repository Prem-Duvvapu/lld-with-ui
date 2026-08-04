package com.lld.zomato.model;

import java.time.LocalDateTime;

public class Payment {
    private String id;
    private String orderId;
    private double amount;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String transactionRef;
    private LocalDateTime timestamp;

    public Payment() {}

    public Payment(String id, String orderId, double amount, PaymentMethod paymentMethod, PaymentStatus status, String transactionRef) {
        this.id = id;
        this.orderId = orderId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.status = status;
        this.transactionRef = transactionRef;
        this.timestamp = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public String getTransactionRef() { return transactionRef; }
    public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
