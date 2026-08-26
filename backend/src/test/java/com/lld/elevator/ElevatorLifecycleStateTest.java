package com.lld.elevator;

import com.lld.elevator.exception.IllegalElevatorStateTransitionException;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorState;
import com.lld.elevator.state.*;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** Exercises the declared elevator state-machine transition table directly, and through
 * {@link Elevator#transitionTo(ElevatorState)}. */
public class ElevatorLifecycleStateTest {

    @Test
    public void idleCanMoveEitherDirectionOrOpenDoorsOrGoToMaintenance() {
        assertEquals(Set.of(ElevatorState.MOVING_UP, ElevatorState.MOVING_DOWN,
                ElevatorState.DOOR_OPEN, ElevatorState.MAINTENANCE), IdleState.INSTANCE.allowedNext());
    }

    @Test
    public void movingCanOnlyStopByOpeningDoorsOrGoToMaintenance() {
        assertEquals(Set.of(ElevatorState.DOOR_OPEN, ElevatorState.MAINTENANCE), MovingUpState.INSTANCE.allowedNext());
        assertEquals(Set.of(ElevatorState.DOOR_OPEN, ElevatorState.MAINTENANCE), MovingDownState.INSTANCE.allowedNext());
        assertFalse(MovingUpState.INSTANCE.canTransitionTo(ElevatorState.MOVING_DOWN),
                "a car moving up cannot reverse straight to moving down without stopping first");
        assertFalse(MovingUpState.INSTANCE.canTransitionTo(ElevatorState.IDLE),
                "a car moving up cannot snap to idle without opening its doors first");
    }

    @Test
    public void doorOpenFansOutToEveryDirectionOrMaintenance() {
        assertEquals(Set.of(ElevatorState.IDLE, ElevatorState.MOVING_UP, ElevatorState.MOVING_DOWN, ElevatorState.MAINTENANCE),
                DoorOpenState.INSTANCE.allowedNext());
    }

    @Test
    public void maintenanceOnlyEverReturnsToIdle() {
        assertEquals(Set.of(ElevatorState.IDLE), MaintenanceState.INSTANCE.allowedNext());
        assertFalse(MaintenanceState.INSTANCE.canTransitionTo(ElevatorState.MOVING_UP));
    }

    @Test
    public void identityTransitionIsAlwaysImplicitlyLegal() {
        for (ElevatorState state : ElevatorState.values()) {
            assertTrue(ElevatorLifecycleStates.of(state).canTransitionTo(state),
                    state + " -> " + state + " (no-op) must always be legal");
        }
    }

    @Test
    public void elevatorTransitionToAppliesLegalMoveAndRejectsIllegalMove() {
        Elevator elevator = new Elevator(1L, "E1", 8, 1);
        assertEquals(ElevatorState.IDLE, elevator.getState());

        elevator.transitionTo(ElevatorState.MOVING_UP);
        assertEquals(ElevatorState.MOVING_UP, elevator.getState());

        IllegalElevatorStateTransitionException ex = assertThrows(IllegalElevatorStateTransitionException.class,
                () -> elevator.transitionTo(ElevatorState.IDLE));
        assertTrue(ex.getMessage().contains("MOVING_UP"));
        // The rejected transition must not have mutated state.
        assertEquals(ElevatorState.MOVING_UP, elevator.getState());
    }

    @Test
    public void elevatorTransitionToAllowsFullRealisticLifecycle() {
        Elevator elevator = new Elevator(1L, "E1", 8, 1);
        elevator.transitionTo(ElevatorState.MOVING_UP);
        elevator.transitionTo(ElevatorState.DOOR_OPEN);
        elevator.transitionTo(ElevatorState.MOVING_DOWN);
        elevator.transitionTo(ElevatorState.DOOR_OPEN);
        elevator.transitionTo(ElevatorState.IDLE);
        elevator.transitionTo(ElevatorState.MAINTENANCE);
        elevator.transitionTo(ElevatorState.IDLE);
        assertEquals(ElevatorState.IDLE, elevator.getState());
    }

    @Test
    public void resolverHasEveryElevatorStateRegistered() {
        for (ElevatorState state : ElevatorState.values()) {
            assertEquals(state, ElevatorLifecycleStates.of(state).getState());
        }
    }
}
