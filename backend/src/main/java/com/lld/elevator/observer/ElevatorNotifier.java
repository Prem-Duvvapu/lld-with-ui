package com.lld.elevator.observer;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class ElevatorNotifier {

    private final List<ElevatorObserver> observers = new CopyOnWriteArrayList<>();

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
