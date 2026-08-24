package com.lld.inventory.observer;

import com.lld.inventory.model.StockAlert;

/**
 * One observer of stock-level crossings. Implementations are notified by
 * {@link StockAlertNotifier} whenever a movement crosses a product's reorder
 * level, hits zero, or restocks a previously-low product.
 *
 * <p>Observers must never throw into the publisher and must never mutate
 * inventory state — they are read-only views of the event stream.
 */
public interface StockAlertObserver {
    void onStockAlert(StockAlert alert);
}
