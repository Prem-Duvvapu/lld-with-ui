package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.Set;

/**
 * State pattern for one task's lifecycle phase. Each concrete state (one class per
 * {@link TaskStatus} constant, singleton instances — the same shape as
 * {@code com.lld.trafficsignal.state.SignalState}) declares the exact set of statuses it may
 * legally move to next via {@link #allowedNext()}. Unlike a traffic light's strict single-successor
 * cycle, a task status can legally fan out to more than one next status (e.g. REVIEW can go to
 * DONE, back to IN_PROGRESS for changes requested, or BLOCKED) — so the table is a declared
 * {@code Set<TaskStatus>} per state rather than a single {@code next()} pointer.
 *
 * <p>{@link com.lld.taskmanagement.model.Task#transitionTo(TaskStatus)} is the one place this
 * table is consulted and enforced; it throws
 * {@link com.lld.taskmanagement.exception.IllegalTaskTransitionException} for anything not in
 * {@link #allowedNext()}.
 */
public interface TaskState {

    TaskStatus getStatus();

    /** The exact set of statuses this state may legally move to next. Empty for a terminal state. */
    Set<TaskStatus> allowedNext();

    /** True when this task can never move again (DONE, CANCELLED). */
    default boolean isTerminal() {
        return allowedNext().isEmpty();
    }

    default boolean canTransitionTo(TaskStatus target) {
        return target != null && allowedNext().contains(target);
    }
}
