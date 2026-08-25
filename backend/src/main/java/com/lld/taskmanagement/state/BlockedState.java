package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.EnumSet;
import java.util.Set;

/** BLOCKED — stalled on an external dependency. May move to IN_PROGRESS (unblocked) or CANCELLED. */
public final class BlockedState implements TaskState {
    public static final BlockedState INSTANCE = new BlockedState();

    private static final Set<TaskStatus> ALLOWED_NEXT =
            EnumSet.of(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED);

    private BlockedState() {}

    @Override
    public TaskStatus getStatus() {
        return TaskStatus.BLOCKED;
    }

    @Override
    public Set<TaskStatus> allowedNext() {
        return ALLOWED_NEXT;
    }
}
