package com.lld.elevator.state;

import com.lld.elevator.model.ElevatorState;

import java.util.Set;

/** MOVING_UP: in transit between floors, climbing. Can only legally stop by opening its doors
 * at a floor with a matching stop, or be pulled for emergency maintenance — it cannot reverse
 * straight to MOVING_DOWN or snap to IDLE without passing through DOOR_OPEN first. */
public final class MovingUpState implements ElevatorLifecycleState {
    public static final MovingUpState INSTANCE = new MovingUpState();

    private MovingUpState() {}

    @Override
    public ElevatorState getState() {
        return ElevatorState.MOVING_UP;
    }

    @Override
    public Set<ElevatorState> allowedNext() {
        return Set.of(ElevatorState.DOOR_OPEN, ElevatorState.MAINTENANCE);
    }
}
