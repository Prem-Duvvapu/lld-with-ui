package com.lld.stockbroker.model;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderStatus;
import com.lld.stockbroker.enums.OrderType;
import lombok.AccessLevel;
import lombok.Getter;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Base order type — {@link BuyOrder} and {@link SellOrder} are the two concrete subclasses
 * {@link com.lld.stockbroker.factory.OrderFactory} produces. {@code filledQuantity} stays an
 * {@link AtomicInteger} (rather than a plain int under Lombok's generated getter) because
 * {@code fill()} is called from inside the per-symbol matching lock in
 * {@link com.lld.stockbroker.strategy.LimitExecutionStrategy}/{@link com.lld.stockbroker.strategy.MarketExecutionStrategy}
 * — the field itself doesn't need atomicity there, but keeping it atomic costs nothing and guards
 * against a future caller reading it without the lock.
 */
@Getter
public abstract class Order {
    private final String orderId;
    private final String accountId;
    private final String symbol;
    private final OrderSide side;
    private final OrderType type;
    private final double limitPrice;
    private final int totalQuantity;
    @Getter(AccessLevel.NONE)
    private final AtomicInteger filledQuantity;
    private volatile OrderStatus status;
    private volatile Instant updatedAt;
    private final Instant createdAt;

    protected Order(String orderId, String accountId, String symbol, OrderSide side,
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

    public int getFilledQuantity() {
        return filledQuantity.get();
    }

    public int getRemainingQuantity() {
        return Math.max(0, totalQuantity - filledQuantity.get());
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
}
