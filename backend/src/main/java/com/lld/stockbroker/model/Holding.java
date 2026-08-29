package com.lld.stockbroker.model;

import com.lld.stockbroker.exception.InsufficientStockException;
import lombok.Builder;
import lombok.Getter;

/**
 * A single symbol's position within a {@link Portfolio}. Every mutator is {@code synchronized}
 * on the {@code Holding} instance itself — the same one-lock-per-mutable-unit idiom
 * {@link Account} uses at the account level, scoped one level finer so two orders on two
 * different symbols in the same portfolio never contend.
 */
@Getter
@Builder
public class Holding {
    private final String symbol;
    private int quantity;
    private int reservedQuantity;
    private double avgBuyPrice;

    public static Holding of(String symbol, int quantity, double avgBuyPrice) {
        return Holding.builder().symbol(symbol).quantity(quantity).avgBuyPrice(avgBuyPrice).build();
    }

    public int getAvailableQuantity() {
        return Math.max(0, quantity - reservedQuantity);
    }

    public synchronized void reserveShares(int qty) {
        if (getAvailableQuantity() < qty) {
            throw new InsufficientStockException("Insufficient available shares for " + symbol +
                    ". Available: " + getAvailableQuantity() + ", Requested: " + qty);
        }
        reservedQuantity += qty;
    }

    public synchronized void releaseReservedShares(int qty) {
        int release = Math.min(qty, reservedQuantity);
        reservedQuantity -= release;
    }

    public synchronized void deductShares(int qty) {
        quantity -= qty;
        int release = Math.min(qty, reservedQuantity);
        reservedQuantity -= release;
    }

    public synchronized void addShares(int qty, double executionPrice) {
        int currentQty = quantity;
        if (currentQty + qty > 0) {
            this.avgBuyPrice = ((this.avgBuyPrice * currentQty) + (executionPrice * qty)) / (currentQty + qty);
        } else {
            this.avgBuyPrice = executionPrice;
        }
        quantity += qty;
    }
}
