package com.lld.elevator.observer;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Keeps the most recent telemetry events in memory, independent of {@link LoggingElevatorObserver}
 * — proof that {@link ElevatorNotifier} genuinely fans out to more than one independent observer
 * (the same shape as {@code inventory.observer.InAppStockAlertObserver} alongside
 * {@code LoggingStockAlertObserver}). Bounded so a long-running demo can't leak memory.
 */
@Component
public class InMemoryElevatorEventObserver implements ElevatorObserver {

    private static final int MAX_EVENTS = 200;

    private final ConcurrentLinkedDeque<String> events = new ConcurrentLinkedDeque<>();

    @Override
    public void onElevatorStateChanged(Elevator elevator, ElevatorState oldState, ElevatorState newState) {
        record("STATE_CHANGE", elevator.getName() + " " + oldState + " -> " + newState + " @F" + elevator.getCurrentFloor());
    }

    @Override
    public void onFloorReached(Elevator elevator, int floor) {
        record("FLOOR_REACHED", elevator.getName() + " reached floor " + floor);
    }

    @Override
    public void onDoorStateChanged(Elevator elevator, boolean isOpen) {
        record("DOOR_" + (isOpen ? "OPEN" : "CLOSE"), elevator.getName() + " doors " + (isOpen ? "opened" : "closed") + " @F" + elevator.getCurrentFloor());
    }

    private void record(String type, String description) {
        events.addFirst(type + ": " + description);
        while (events.size() > MAX_EVENTS) {
            events.removeLast();
        }
    }

    public List<String> recentEvents() {
        return List.copyOf(events);
    }

    public int eventCount() {
        return events.size();
    }
}
