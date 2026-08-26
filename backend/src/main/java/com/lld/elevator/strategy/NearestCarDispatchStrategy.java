package com.lld.elevator.strategy;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * The simple baseline dispatch policy: ignore direction of travel entirely and hand the call to
 * whichever eligible car is physically closest right now. Cheap to reason about and a fair
 * comparison point against {@link LookScanDispatchStrategy}'s on-the-way scoring — a car that has
 * already passed the requested floor going the wrong way still "wins" here if it is nearest,
 * which is exactly the naive behavior LOOK/SCAN improves on.
 */
@Component
public class NearestCarDispatchStrategy implements ElevatorDispatchStrategy {

    @Override
    public Elevator selectOptimalElevator(List<Elevator> elevators, int sourceFloor, Direction direction, int passengerCount) {
        Elevator best = null;
        int bestDistance = Integer.MAX_VALUE;

        for (Elevator elevator : elevators) {
            if (elevator.getState() == ElevatorState.MAINTENANCE) {
                continue;
            }
            if (elevator.isFull() || (elevator.getCurrentOccupancy() + passengerCount > elevator.getCapacity())) {
                continue;
            }

            int distance = Math.abs(elevator.getCurrentFloor() - sourceFloor);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = elevator;
            } else if (distance == bestDistance && best != null) {
                // Tie-break: lower occupancy, then fewer pending stops, then lower id — same
                // deterministic ladder as LookScanDispatchStrategy.
                if (elevator.getCurrentOccupancy() < best.getCurrentOccupancy()) {
                    best = elevator;
                } else if (elevator.getCurrentOccupancy() == best.getCurrentOccupancy()
                        && elevator.getPendingFloors().size() < best.getPendingFloors().size()) {
                    best = elevator;
                } else if (elevator.getCurrentOccupancy() == best.getCurrentOccupancy()
                        && elevator.getPendingFloors().size() == best.getPendingFloors().size()
                        && elevator.getId() < best.getId()) {
                    best = elevator;
                }
            }
        }

        return best;
    }
}
