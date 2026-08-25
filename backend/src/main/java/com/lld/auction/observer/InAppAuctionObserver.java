package com.lld.auction.observer;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Keeps the most recent outbid notifications in memory so the UI can poll them at
 * {@code GET /api/auction/notifications}. Bounded to the last 100 events.
 *
 * <p>Instantiated once by Spring for the live module; the sim sandbox news up its own instance
 * so sandbox notifications never bleed into the live feed.
 */
@Component
public class InAppAuctionObserver implements AuctionObserver {

    private static final int MAX_EVENTS = 100;

    private final Deque<OutbidEvent> events = new ArrayDeque<>();

    @Override
    public synchronized void onOutbid(OutbidEvent event) {
        events.addLast(event);
        while (events.size() > MAX_EVENTS) {
            events.removeFirst();
        }
    }

    public synchronized List<OutbidEvent> recentEvents() {
        return new ArrayList<>(events);
    }

    public synchronized void clear() {
        events.clear();
    }
}
