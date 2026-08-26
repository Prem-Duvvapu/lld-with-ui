package com.lld.elevator.state;

import com.lld.elevator.model.ElevatorState;

import java.util.Set;

/** MAINTENANCE: pulled out of service. The only legal way out is being explicitly returned to
 * service, which always lands back on IDLE — it never resumes mid-trip. */
public final class MaintenanceState implements ElevatorLifecycleState {
    public static final MaintenanceState INSTANCE = new MaintenanceState();

    private MaintenanceState() {}

    @Override
    public ElevatorState getState() {
        return ElevatorState.MAINTENANCE;
    }

    @Override
    public Set<ElevatorState> allowedNext() {
        return Set.of(ElevatorState.IDLE);
    }
}
