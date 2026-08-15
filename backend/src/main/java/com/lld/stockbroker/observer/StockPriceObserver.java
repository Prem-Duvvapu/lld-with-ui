package com.lld.stockbroker.observer;

import java.time.Instant;

public interface StockPriceObserver {
    void onPriceUpdate(String symbol, double oldPrice, double newPrice, int volume, Instant timestamp);
}
