package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.Set;

/** DONE — terminal. Nothing may follow it; see {@link TaskState#isTerminal()}. */
public final class DoneState implements TaskState {
    public static final DoneState INSTANCE = new DoneState();

    private DoneState() {}

    @Override
    public TaskStatus getStatus() {
        return TaskStatus.DONE;
    }

    @Override
    public Set<TaskStatus> allowedNext() {
        return Set.of();
    }
}
