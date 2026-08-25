package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.EnumSet;
import java.util.Set;

/** TODO — not started yet. May move to IN_PROGRESS (work begins) or CANCELLED. */
public final class TodoState implements TaskState {
    public static final TodoState INSTANCE = new TodoState();

    private static final Set<TaskStatus> ALLOWED_NEXT =
            EnumSet.of(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED);

    private TodoState() {}

    @Override
    public TaskStatus getStatus() {
        return TaskStatus.TODO;
    }

    @Override
    public Set<TaskStatus> allowedNext() {
        return ALLOWED_NEXT;
    }
}
