package com.lld.stockbroker.model;

import com.lld.stockbroker.observer.StockPriceObserver;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * A tradeable instrument. {@code observers} is the Observer-pattern subject list —
 * {@link #notifyPriceUpdate} is the one place a matched trade fans out to every registered
 * {@link StockPriceObserver} (in-app quote feed, logging ticker) after the price actually moves.
 */
@Getter
public class Stock {
    private final String symbol;
    private final String name;
    private volatile double currentPrice;
    private final List<StockPriceObserver> observers = new CopyOnWriteArrayList<>();

    public Stock(String symbol, String name, double initialPrice) {
        this.symbol = symbol != null ? symbol.toUpperCase().trim() : "STOCK";
        this.name = name != null ? name.trim() : this.symbol;
        this.currentPrice = initialPrice;
    }

    public void setCurrentPrice(double newPrice) {
        this.currentPrice = newPrice;
    }

    public void registerObserver(StockPriceObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(StockPriceObserver observer) {
        observers.remove(observer);
    }

    public void notifyPriceUpdate(double oldPrice, double newPrice, int volume) {
        this.currentPrice = newPrice;
        Instant now = Instant.now();
        for (StockPriceObserver observer : observers) {
            try {
                observer.onPriceUpdate(symbol, oldPrice, newPrice, volume, now);
            } catch (Exception ignored) {
            }
        }
    }
}
