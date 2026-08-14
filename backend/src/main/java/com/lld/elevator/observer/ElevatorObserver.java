package com.lld.elevator.observer;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;

public interface ElevatorObserver {
    void onElevatorStateChanged(Elevator elevator, ElevatorState oldState, ElevatorState newState);
    void onFloorReached(Elevator elevator, int floor);
    void onDoorStateChanged(Elevator elevator, boolean isOpen);
}
