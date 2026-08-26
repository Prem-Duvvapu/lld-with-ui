package com.lld.elevator.state;

import com.lld.elevator.model.ElevatorState;

import java.util.EnumMap;
import java.util.Map;

/** Resolves {@link ElevatorState} to its singleton {@link ElevatorLifecycleState}. Built once, read-only after. */
public final class ElevatorLifecycleStates {

    private static final Map<ElevatorState, ElevatorLifecycleState> BY_STATE = new EnumMap<>(ElevatorState.class);

    static {
        BY_STATE.put(ElevatorState.IDLE, IdleState.INSTANCE);
        BY_STATE.put(ElevatorState.MOVING_UP, MovingUpState.INSTANCE);
        BY_STATE.put(ElevatorState.MOVING_DOWN, MovingDownState.INSTANCE);
        BY_STATE.put(ElevatorState.DOOR_OPEN, DoorOpenState.INSTANCE);
        BY_STATE.put(ElevatorState.MAINTENANCE, MaintenanceState.INSTANCE);
    }

    private ElevatorLifecycleStates() {}

    public static ElevatorLifecycleState of(ElevatorState state) {
        ElevatorLifecycleState lifecycleState = BY_STATE.get(state);
        if (lifecycleState == null) {
            throw new IllegalArgumentException("No ElevatorLifecycleState registered for state " + state);
        }
        return lifecycleState;
    }
}
