package com.lld.stockbroker.model;

import com.lld.stockbroker.exception.InsufficientStockException;

import java.util.concurrent.atomic.AtomicInteger;

public class Holding {
    private final String symbol;
    private final AtomicInteger quantity;
    private final AtomicInteger reservedQuantity;
    private volatile double avgBuyPrice;

    public Holding(String symbol, int quantity, double avgBuyPrice) {
        this.symbol = symbol;
        this.quantity = new AtomicInteger(quantity);
        this.reservedQuantity = new AtomicInteger(0);
        this.avgBuyPrice = avgBuyPrice;
    }

    public String getSymbol() {
        return symbol;
    }

    public int getQuantity() {
        return quantity.get();
    }

    public int getReservedQuantity() {
        return reservedQuantity.get();
    }

    public int getAvailableQuantity() {
        return Math.max(0, quantity.get() - reservedQuantity.get());
    }

    public double getAvgBuyPrice() {
        return avgBuyPrice;
    }

    public synchronized void reserveShares(int qty) {
        if (getAvailableQuantity() < qty) {
            throw new InsufficientStockException("Insufficient available shares for " + symbol +
                    ". Available: " + getAvailableQuantity() + ", Requested: " + qty);
        }
        reservedQuantity.addAndGet(qty);
    }

    public synchronized void releaseReservedShares(int qty) {
        int release = Math.min(qty, reservedQuantity.get());
        reservedQuantity.addAndGet(-release);
    }

    public synchronized void deductShares(int qty) {
        quantity.addAndGet(-qty);
        int release = Math.min(qty, reservedQuantity.get());
        reservedQuantity.addAndGet(-release);
    }

    public synchronized void addShares(int qty, double executionPrice) {
        int currentQty = quantity.get();
        if (currentQty + qty > 0) {
            this.avgBuyPrice = ((this.avgBuyPrice * currentQty) + (executionPrice * qty)) / (currentQty + qty);
        } else {
            this.avgBuyPrice = executionPrice;
        }
        quantity.addAndGet(qty);
    }
}
