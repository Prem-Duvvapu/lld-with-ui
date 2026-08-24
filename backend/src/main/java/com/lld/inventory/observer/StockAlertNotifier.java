package com.lld.inventory.observer;

import com.lld.inventory.model.StockAlert;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Subject of the inventory Observer pattern. Fans every {@link StockAlert} out
 * to a {@link CopyOnWriteArrayList} of observers, so publish never locks and
 * subscribe/unsubscribe during a publish is safe (same idiom as cricinfo's
 * {@code MatchPublisher}).
 *
 * <p>Spring injects every {@link StockAlertObserver} bean into the live
 * instance; the sim sandbox constructs its own with fresh observer instances,
 * keeping the two event streams fully isolated.
 */
@Component
public class StockAlertNotifier {

    private final List<StockAlertObserver> observers = new CopyOnWriteArrayList<>();

    public StockAlertNotifier(List<StockAlertObserver> observers) {
        this.observers.addAll(observers);
    }

    public void registerObserver(StockAlertObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(StockAlertObserver observer) {
        if (observer != null) {
            observers.remove(observer);
        }
    }

    public int observerCount() {
        return observers.size();
    }

    /** Publishes to every observer; one misbehaving observer cannot break the rest. */
    public void publish(StockAlert alert) {
        for (StockAlertObserver observer : observers) {
            try {
                observer.onStockAlert(alert);
            } catch (RuntimeException e) {
                System.err.println("[inventory] observer failed: " + e.getMessage());
            }
        }
    }
}
