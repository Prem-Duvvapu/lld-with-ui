package com.lld.shoppingcart.model;

import java.util.List;

public class Order {
    private final String orderId;
    private final String userId;
    private final List<OrderItem> items;
    private final double totalAmount;
    private OrderStatus status;
    private String paymentTransactionId;
    private final PaymentMethod paymentMethod;
    private final long createdAtEpoch;

    public Order(String orderId, String userId, List<OrderItem> items, double totalAmount, PaymentMethod paymentMethod) {
        this.orderId = orderId;
        this.userId = userId;
        this.items = items;
        this.totalAmount = totalAmount;
        this.paymentMethod = paymentMethod;
        this.status = OrderStatus.PLACED;
        this.createdAtEpoch = System.currentTimeMillis();
    }

    public String getOrderId() {
        return orderId;
    }

    public String getUserId() {
        return userId;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public String getPaymentTransactionId() {
        return paymentTransactionId;
    }

    public void setPaymentTransactionId(String paymentTransactionId) {
        this.paymentTransactionId = paymentTransactionId;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public long getCreatedAtEpoch() {
        return createdAtEpoch;
    }
}