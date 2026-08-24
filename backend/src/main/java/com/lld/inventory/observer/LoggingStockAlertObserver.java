package com.lld.inventory.observer;

import com.lld.inventory.model.StockAlert;
import org.springframework.stereotype.Component;

/**
 * Writes every alert to the server log — demonstrates that two observers with
 * completely different sinks receive the same event without knowing each other.
 */
@Component
public class LoggingStockAlertObserver implements StockAlertObserver {

    @Override
    public void onStockAlert(StockAlert alert) {
        System.out.printf("[inventory-alert] %s %s (stock=%d, reorderLevel=%d)%n",
                alert.getType(), alert.getProductName(), alert.getCurrentStock(), alert.getReorderLevel());
    }
}
