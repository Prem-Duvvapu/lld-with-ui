package com.lld.taskmanagement.model;

/**
 * Task lifecycle. The legal transition table lives on the {@link com.lld.taskmanagement.state.TaskState}
 * hierarchy in {@code com.lld.taskmanagement.state} — one concrete {@code TaskState} class per
 * constant here, each declaring the exact set of statuses it may legally move to next — rather
 * than as an if/else chain scattered across service methods.
 */
public enum TaskStatus {
    TODO,
    IN_PROGRESS,
    REVIEW,
    BLOCKED,
    DONE,
    CANCELLED
}
