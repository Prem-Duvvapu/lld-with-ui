package com.lld.socialnetwork.observer;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Keeps the most recent feed-fanout events in memory so the UI can poll them (the sim tab's
 * live telemetry HUD reads this through the sandbox's own instance). Bounded to the last 100
 * events, same cap as {@code InAppStockAlertObserver}.
 *
 * <p>Instantiated once by Spring for the live module; the sim sandbox news up its own instance
 * so sandbox fan-out events never bleed into the live feed log.
 */
@Component
public class InAppFeedObserver implements FeedObserver {

    private static final int MAX_EVENTS = 100;

    private final Deque<FeedEvent> events = new ArrayDeque<>();

    @Override
    public synchronized void onFeedEvent(FeedEvent event) {
        events.addLast(event);
        while (events.size() > MAX_EVENTS) {
            events.removeFirst();
        }
    }

    public synchronized List<FeedEvent> recentEvents() {
        return new ArrayList<>(events);
    }

    public synchronized void clear() {
        events.clear();
    }
}
