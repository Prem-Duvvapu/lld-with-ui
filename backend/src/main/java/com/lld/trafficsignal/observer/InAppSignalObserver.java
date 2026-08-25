package com.lld.trafficsignal.observer;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/** Keeps the most recent phase-change events in memory, bounded to the last 200. */
public class InAppSignalObserver implements SignalObserver {

    private static final int MAX_EVENTS = 200;

    private final Deque<SignalChangeEvent> events = new ArrayDeque<>();

    @Override
    public synchronized void onSignalChange(SignalChangeEvent event) {
        events.addLast(event);
        while (events.size() > MAX_EVENTS) {
            events.removeFirst();
        }
    }

    public synchronized List<SignalChangeEvent> recentEvents() {
        return new ArrayList<>(events);
    }

    public synchronized void clear() {
        events.clear();
    }
}
