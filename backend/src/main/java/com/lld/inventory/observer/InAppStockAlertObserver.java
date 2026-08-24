package com.lld.inventory.observer;

import com.lld.inventory.model.StockAlert;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Keeps the most recent alerts in memory so the UI can poll them at
 * {@code GET /api/inventory/alerts}. Bounded to the last 100 alerts.
 *
 * <p>Instantiated once by Spring for the live module; the sim sandbox news up
 * its own instance so sandbox alerts never bleed into the live feed.
 */
@Component
public class InAppStockAlertObserver implements StockAlertObserver {

    private static final int MAX_ALERTS = 100;

    private final Deque<StockAlert> alerts = new ArrayDeque<>();

    @Override
    public synchronized void onStockAlert(StockAlert alert) {
        alerts.addLast(alert);
        while (alerts.size() > MAX_ALERTS) {
            alerts.removeFirst();
        }
    }

    public synchronized List<StockAlert> recentAlerts() {
        return new ArrayList<>(alerts);
    }
}
