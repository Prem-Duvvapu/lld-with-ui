package com.lld.elevator.strategy;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class LookScanDispatchStrategy implements ElevatorDispatchStrategy {

    public static final double PENALTY_PASSED = 50.0;
    public static final double PENALTY_MISMATCH = 100.0;

    @Override
    public Elevator selectOptimalElevator(List<Elevator> elevators, int sourceFloor, Direction direction, int passengerCount) {
        double bestScore = Double.MAX_VALUE;
        Elevator bestElevator = null;

        for (Elevator elevator : elevators) {
            // 1. Ignore elevators in maintenance or out of order
            if (elevator.getState() == ElevatorState.MAINTENANCE) {
                continue;
            }

            // 2. Ignore full elevators or elevators that cannot fit passengerCount
            if (elevator.isFull() || (elevator.getCurrentOccupancy() + passengerCount > elevator.getCapacity())) {
                continue;
            }

            int dist = Math.abs(elevator.getCurrentFloor() - sourceFloor);
            double score;

            Direction elevatorDir = elevator.getDirection();

            if (elevatorDir == Direction.IDLE || elevator.getState() == ElevatorState.IDLE) {
                score = dist;
            } else if (elevatorDir == direction) {
                if (isOnWay(elevator, sourceFloor, direction)) {
                    score = dist;
                } else {
                    score = dist + PENALTY_PASSED;
                }
            } else {
                score = dist + PENALTY_MISMATCH;
            }

            // Tie-breaking evaluation
            if (score < bestScore) {
                bestScore = score;
                bestElevator = elevator;
            } else if (Math.abs(score - bestScore) < 1e-6 && bestElevator != null) {
                // Tie-break 1: Lower occupancy
                if (elevator.getCurrentOccupancy() < bestElevator.getCurrentOccupancy()) {
                    bestElevator = elevator;
                } else if (elevator.getCurrentOccupancy() == bestElevator.getCurrentOccupancy()) {
                    // Tie-break 2: Fewer pending stops
                    if (elevator.getPendingFloors().size() < bestElevator.getPendingFloors().size()) {
                        bestElevator = elevator;
                    } else if (elevator.getPendingFloors().size() == bestElevator.getPendingFloors().size()) {
                        // Tie-break 3: Deterministic lower ID
                        if (elevator.getId() < bestElevator.getId()) {
                            bestElevator = elevator;
                        }
                    }
                }
            }
        }

        return bestElevator;
    }

    private boolean isOnWay(Elevator elevator, int targetFloor, Direction requestDirection) {
        if (requestDirection == Direction.UP) {
            return elevator.getCurrentFloor() <= targetFloor;
        } else if (requestDirection == Direction.DOWN) {
            return elevator.getCurrentFloor() >= targetFloor;
        }
        return true;
    }
}
