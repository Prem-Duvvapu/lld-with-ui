package com.lld.cricinfo.observer;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * The Subject. A CopyOnWriteArrayList (same choice as logging's Logger and
 * pubsub's Topic) so that iterating to publish an event never races with a
 * concurrent subscribe/unsubscribe — publish() always sees a stable
 * snapshot of subscribers taken at call time, and a subscribe/unsubscribe
 * never throws ConcurrentModificationException no matter how many ball
 * events are in flight for other matches at the same moment.
 *
 * <p>One publisher instance is shared by every match; BallEvent carries the
 * matchId-bearing Match, so a single fan-out list is enough — observers
 * key their own per-match state internally (see ScorecardProjectionObserver).
 */
public class MatchPublisher {

    private final List<BallEventObserver> observers = new CopyOnWriteArrayList<>();

    public void subscribe(BallEventObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void unsubscribe(BallEventObserver observer) {
        if (observer != null) {
            observers.remove(observer);
        }
    }

    public void publish(BallEvent event) {
        for (BallEventObserver observer : observers) {
            observer.onBallBowled(event);
        }
    }

    public List<BallEventObserver> getObservers() {
        return List.copyOf(observers);
    }

    public int observerCount() {
        return observers.size();
    }
}
