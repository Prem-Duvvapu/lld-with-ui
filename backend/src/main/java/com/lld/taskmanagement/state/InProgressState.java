package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.EnumSet;
import java.util.Set;

/** IN_PROGRESS — actively being worked. May move to REVIEW, BLOCKED, or CANCELLED. */
public final class InProgressState implements TaskState {
    public static final InProgressState INSTANCE = new InProgressState();

    private static final Set<TaskStatus> ALLOWED_NEXT =
            EnumSet.of(TaskStatus.REVIEW, TaskStatus.BLOCKED, TaskStatus.CANCELLED);

    private InProgressState() {}

    @Override
    public TaskStatus getStatus() {
        return TaskStatus.IN_PROGRESS;
    }

    @Override
    public Set<TaskStatus> allowedNext() {
        return ALLOWED_NEXT;
    }
}
