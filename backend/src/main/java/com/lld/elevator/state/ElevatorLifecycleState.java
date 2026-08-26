package com.lld.elevator.state;

import com.lld.elevator.model.ElevatorState;

import java.util.Set;

/**
 * State pattern for one elevator car's lifecycle phase. Each concrete state (one singleton class
 * per {@link ElevatorState} constant — the same shape as
 * {@code com.lld.taskmanagement.state.TaskState}) declares the exact set of phases it may legally
 * move to next via {@link #allowedNext()}. Unlike a traffic light's strict single-successor cycle,
 * an elevator can legally fan out (DOOR_OPEN can go to IDLE, MOVING_UP, MOVING_DOWN or
 * MAINTENANCE depending on what stops remain queued), so the table is a declared
 * {@code Set<ElevatorState>} per state rather than a single {@code next()} pointer.
 *
 * <p>{@link com.lld.elevator.model.Elevator#transitionTo(ElevatorState)} is the one place this
 * table is consulted and enforced; it throws
 * {@link com.lld.elevator.exception.IllegalElevatorStateTransitionException} for anything not in
 * {@link #allowedNext()}. A request to stay in the current state (e.g. {@code MOVING_UP ->
 * MOVING_UP} while continuing between floors) is always legal — {@link #canTransitionTo} treats
 * the identity transition as an implicit no-op so callers never need to special-case it.
 */
public interface ElevatorLifecycleState {

    ElevatorState getState();

    /** The exact set of states this state may legally move to next. */
    Set<ElevatorState> allowedNext();

    default boolean canTransitionTo(ElevatorState target) {
        return target != null && (target == getState() || allowedNext().contains(target));
    }
}
