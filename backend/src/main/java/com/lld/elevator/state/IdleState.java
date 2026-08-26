package com.lld.elevator.state;

import com.lld.elevator.model.ElevatorState;

import java.util.Set;

/** IDLE: parked with no pending stops. May start moving in either direction, open its doors for
 * a call at its own floor, or be pulled for maintenance. */
public final class IdleState implements ElevatorLifecycleState {
    public static final IdleState INSTANCE = new IdleState();

    private IdleState() {}

    @Override
    public ElevatorState getState() {
        return ElevatorState.IDLE;
    }

    @Override
    public Set<ElevatorState> allowedNext() {
        return Set.of(ElevatorState.MOVING_UP, ElevatorState.MOVING_DOWN,
                ElevatorState.DOOR_OPEN, ElevatorState.MAINTENANCE);
    }
}
