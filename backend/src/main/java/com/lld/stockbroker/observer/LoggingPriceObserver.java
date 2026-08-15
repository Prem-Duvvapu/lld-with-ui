package com.lld.stockbroker.observer;

import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class LoggingPriceObserver implements StockPriceObserver {

    @Override
    public void onPriceUpdate(String symbol, double oldPrice, double newPrice, int volume, Instant timestamp) {
        System.out.printf("[MARKET-TICKER] %s: ₹%.2f -> ₹%.2f (Vol: %d) at %s%n",
                symbol, oldPrice, newPrice, volume, timestamp);
    }
}
