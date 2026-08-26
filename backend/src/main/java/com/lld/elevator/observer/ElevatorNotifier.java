package com.lld.elevator.observer;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Subject of the elevator Observer pattern. Fans every telemetry event out to a
 * {@link CopyOnWriteArrayList} of observers, so publish never locks and subscribe/unsubscribe
 * during a publish is safe (same idiom as {@code inventory.observer.StockAlertNotifier}).
 *
 * <p>Spring injects every {@link ElevatorObserver} bean into the live instance
 * ({@link LoggingElevatorObserver}, {@link InMemoryElevatorEventObserver}); the isolated
 * {@code /sim/*} sandbox in {@code ElevatorControllerService} intentionally does not route
 * through this notifier at all — it keeps its own {@code SimEvent} log — so a replayed demo can
 * never appear in the real telemetry stream.
 */
@Component
public class ElevatorNotifier {

    private final List<ElevatorObserver> observers = new CopyOnWriteArrayList<>();

    /** Convenience constructor for tests that don't need any observers wired up. */
    public ElevatorNotifier() {
        this(List.of());
    }

    public ElevatorNotifier(List<ElevatorObserver> observers) {
        this.observers.addAll(observers);
    }

    public int observerCount() {
        return observers.size();
    }

    public void registerObserver(ElevatorObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(ElevatorObserver observer) {
        if (observer != null) {
            observers.remove(observer);
        }
    }

    public void notifyStateChange(Elevator elevator, ElevatorState oldState, ElevatorState newState) {
        for (ElevatorObserver observer : observers) {
            try {
                observer.onElevatorStateChanged(elevator, oldState, newState);
            } catch (Exception ignored) {}
        }
    }

    public void notifyFloorReached(Elevator elevator, int floor) {
        for (ElevatorObserver observer : observers) {
            try {
                observer.onFloorReached(elevator, floor);
            } catch (Exception ignored) {}
        }
    }

    public void notifyDoorChange(Elevator elevator, boolean isOpen) {
        for (ElevatorObserver observer : observers) {
            try {
                observer.onDoorStateChanged(elevator, isOpen);
            } catch (Exception ignored) {}
        }
    }
}
