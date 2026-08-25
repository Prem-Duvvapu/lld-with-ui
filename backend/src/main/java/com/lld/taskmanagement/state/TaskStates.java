package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.EnumMap;
import java.util.Map;

/** Resolves {@link TaskStatus} to its singleton {@link TaskState}. Built once, read-only after. */
public final class TaskStates {

    private static final Map<TaskStatus, TaskState> BY_STATUS = new EnumMap<>(TaskStatus.class);

    static {
        BY_STATUS.put(TaskStatus.TODO, TodoState.INSTANCE);
        BY_STATUS.put(TaskStatus.IN_PROGRESS, InProgressState.INSTANCE);
        BY_STATUS.put(TaskStatus.REVIEW, ReviewState.INSTANCE);
        BY_STATUS.put(TaskStatus.BLOCKED, BlockedState.INSTANCE);
        BY_STATUS.put(TaskStatus.DONE, DoneState.INSTANCE);
        BY_STATUS.put(TaskStatus.CANCELLED, CancelledState.INSTANCE);
    }

    private TaskStates() {}

    public static TaskState of(TaskStatus status) {
        TaskState state = BY_STATUS.get(status);
        if (state == null) {
            throw new IllegalArgumentException("No TaskState registered for status " + status);
        }
        return state;
    }
}
