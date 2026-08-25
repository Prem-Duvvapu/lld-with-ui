package com.lld.socialnetwork.observer;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Subject of the social-network Observer pattern. Fans every {@link FeedEvent} out to a
 * {@link CopyOnWriteArrayList} of observers, so publish never locks and subscribe/unsubscribe
 * during a publish is safe — same idiom as {@code inventory.observer.StockAlertNotifier}.
 *
 * <p>Spring injects every {@link FeedObserver} bean into the live instance; the isolated sim
 * sandbox constructs its own with fresh observer instances, keeping the two event streams fully
 * isolated (see {@code SocialService#resetSandbox}).
 */
@Component
public class FeedNotifier {

    private final List<FeedObserver> observers = new CopyOnWriteArrayList<>();

    public FeedNotifier(List<FeedObserver> observers) {
        this.observers.addAll(observers);
    }

    public void registerObserver(FeedObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(FeedObserver observer) {
        if (observer != null) {
            observers.remove(observer);
        }
    }

    public int observerCount() {
        return observers.size();
    }

    /** Publishes to every observer; one misbehaving observer cannot break the rest. */
    public void publish(FeedEvent event) {
        for (FeedObserver observer : observers) {
            try {
                observer.onFeedEvent(event);
            } catch (RuntimeException e) {
                System.err.println("[socialnetwork] observer failed: " + e.getMessage());
            }
        }
    }
}
