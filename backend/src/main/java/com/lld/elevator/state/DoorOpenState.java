package com.lld.elevator.state;

import com.lld.elevator.model.ElevatorState;

import java.util.Set;

/** DOOR_OPEN: stopped at a floor, doors parted for boarding/deboarding. Once the door timer
 * elapses it fans out to whichever direction still has queued stops, or settles back to IDLE. */
public final class DoorOpenState implements ElevatorLifecycleState {
    public static final DoorOpenState INSTANCE = new DoorOpenState();

    private DoorOpenState() {}

    @Override
    public ElevatorState getState() {
        return ElevatorState.DOOR_OPEN;
    }

    @Override
    public Set<ElevatorState> allowedNext() {
        return Set.of(ElevatorState.IDLE, ElevatorState.MOVING_UP,
                ElevatorState.MOVING_DOWN, ElevatorState.MAINTENANCE);
    }
}
