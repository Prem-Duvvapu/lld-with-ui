package com.lld.elevator.strategy;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;

import java.util.List;

public interface ElevatorDispatchStrategy {
    Elevator selectOptimalElevator(List<Elevator> elevators, int sourceFloor, Direction direction, int passengerCount);
}
