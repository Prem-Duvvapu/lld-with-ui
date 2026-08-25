package com.lld.auction.observer;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Subject of the auction Observer pattern. Fans every {@link OutbidEvent} out to a
 * {@link CopyOnWriteArrayList} of observers, so publish never locks and subscribe/unsubscribe
 * during a publish is safe — the same idiom as inventory's {@code StockAlertNotifier}.
 *
 * <p>Spring injects every {@link AuctionObserver} bean into the live instance; the sim sandbox
 * constructs its own with fresh observer instances, keeping the two event streams fully isolated.
 */
@Component
public class AuctionNotifier {

    private final List<AuctionObserver> observers = new CopyOnWriteArrayList<>();

    public AuctionNotifier(List<AuctionObserver> observers) {
        this.observers.addAll(observers);
    }

    public void registerObserver(AuctionObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(AuctionObserver observer) {
        if (observer != null) {
            observers.remove(observer);
        }
    }

    public int observerCount() {
        return observers.size();
    }

    /** Publishes to every observer; one misbehaving observer cannot break the rest. */
    public void publish(OutbidEvent event) {
        for (AuctionObserver observer : observers) {
            try {
                observer.onOutbid(event);
            } catch (RuntimeException e) {
                System.err.println("[auction] observer failed: " + e.getMessage());
            }
        }
    }
}
