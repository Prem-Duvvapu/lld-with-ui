package com.lld.trafficsignal.observer;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Subject of the traffic-signal Observer pattern. Fans every {@link SignalChangeEvent} out to a
 * {@link CopyOnWriteArrayList} of observers, so publish never locks and subscribe/unsubscribe
 * during a publish is safe. Mirrors {@code inventory.observer.StockAlertNotifier}'s shape.
 *
 * <p>The live intersection and the isolated {@code /sim/*} sandbox each own their own notifier
 * instance (constructed fresh, not Spring-shared) so a demo run's events never bleed into the
 * production event stream.
 */
public class SignalChangeNotifier {

    private final List<SignalObserver> observers = new CopyOnWriteArrayList<>();

    public void registerObserver(SignalObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(SignalObserver observer) {
        if (observer != null) {
            observers.remove(observer);
        }
    }

    public int observerCount() {
        return observers.size();
    }

    /** Publishes to every observer; one misbehaving observer cannot break the rest. */
    public void publish(SignalChangeEvent event) {
        for (SignalObserver observer : observers) {
            try {
                observer.onSignalChange(event);
            } catch (RuntimeException e) {
                System.err.println("[trafficsignal] observer failed: " + e.getMessage());
            }
        }
    }
}
