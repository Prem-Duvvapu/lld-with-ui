package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.Set;

/** CANCELLED — terminal. Nothing may follow it; see {@link TaskState#isTerminal()}. */
public final class CancelledState implements TaskState {
    public static final CancelledState INSTANCE = new CancelledState();

    private CancelledState() {}

    @Override
    public TaskStatus getStatus() {
        return TaskStatus.CANCELLED;
    }

    @Override
    public Set<TaskStatus> allowedNext() {
        return Set.of();
    }
}
