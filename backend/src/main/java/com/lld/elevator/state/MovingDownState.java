package com.lld.elevator.state;

import com.lld.elevator.model.ElevatorState;

import java.util.Set;

/** MOVING_DOWN: in transit between floors, descending. Mirror of {@link MovingUpState}. */
public final class MovingDownState implements ElevatorLifecycleState {
    public static final MovingDownState INSTANCE = new MovingDownState();

    private MovingDownState() {}

    @Override
    public ElevatorState getState() {
        return ElevatorState.MOVING_DOWN;
    }

    @Override
    public Set<ElevatorState> allowedNext() {
        return Set.of(ElevatorState.DOOR_OPEN, ElevatorState.MAINTENANCE);
    }
}
