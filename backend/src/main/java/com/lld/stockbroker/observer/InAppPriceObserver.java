package com.lld.stockbroker.observer;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class InAppPriceObserver implements StockPriceObserver {

    private final List<Map<String, Object>> recentQuotes = new CopyOnWriteArrayList<>();

    @Override
    public void onPriceUpdate(String symbol, double oldPrice, double newPrice, int volume, Instant timestamp) {
        double changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100.0 : 0.0;
        Map<String, Object> quote = Map.of(
                "symbol", symbol,
                "oldPrice", oldPrice,
                "newPrice", newPrice,
                "changePercent", changePercent,
                "volume", volume,
                "timestamp", timestamp != null ? timestamp.toString() : Instant.now().toString()
        );

        recentQuotes.add(0, quote); // Latest first
        while (recentQuotes.size() > 50) {
            recentQuotes.remove(recentQuotes.size() - 1);
        }
    }

    public List<Map<String, Object>> getRecentQuotes() {
        return Collections.unmodifiableList(recentQuotes);
    }
}
