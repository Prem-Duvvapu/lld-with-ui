package com.lld.stockbroker.model;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderStatus;
import com.lld.stockbroker.enums.OrderType;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;

public abstract class Order {
    private final String orderId;
    private final String accountId;
    private final String symbol;
    private final OrderSide side;
    private final OrderType type;
    private final double limitPrice;
    private final int totalQuantity;
    private final AtomicInteger filledQuantity;
    private volatile OrderStatus status;
    private final Instant createdAt;
    private volatile Instant updatedAt;

    public Order(String orderId, String accountId, String symbol, OrderSide side,
                 OrderType type, double limitPrice, int totalQuantity) {
        this.orderId = orderId;
        this.accountId = accountId;
        this.symbol = symbol != null ? symbol.toUpperCase().trim() : "STOCK";
        this.side = side;
        this.type = type;
        this.limitPrice = limitPrice;
        this.totalQuantity = totalQuantity;
        this.filledQuantity = new AtomicInteger(0);
        this.status = OrderStatus.PENDING;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getAccountId() {
        return accountId;
    }

    public String getSymbol() {
        return symbol;
    }

    public OrderSide getSide() {
        return side;
    }

    public OrderType getType() {
        return type;
    }

    public double getLimitPrice() {
        return limitPrice;
    }

    public int getTotalQuantity() {
        return totalQuantity;
    }

    public int getFilledQuantity() {
        return filledQuantity.get();
    }

    public int getRemainingQuantity() {
        return Math.max(0, totalQuantity - filledQuantity.get());
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public synchronized void fill(int qty) {
        int current = filledQuantity.addAndGet(qty);
        if (current >= totalQuantity) {
            this.status = OrderStatus.EXECUTED;
        } else if (current > 0) {
            this.status = OrderStatus.PARTIALLY_FILLED;
        }
        this.updatedAt = Instant.now();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
