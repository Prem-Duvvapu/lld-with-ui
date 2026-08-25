package com.lld.taskmanagement.state;

import com.lld.taskmanagement.model.TaskStatus;

import java.util.EnumSet;
import java.util.Set;

/**
 * REVIEW — awaiting sign-off. May move to DONE (approved), back to IN_PROGRESS (changes
 * requested), to BLOCKED, or to CANCELLED. The one status in this module with three live
 * successors — the "changes requested" loop back to IN_PROGRESS is why {@link #allowedNext()}
 * is a set rather than a single pointer.
 */
public final class ReviewState implements TaskState {
    public static final ReviewState INSTANCE = new ReviewState();

    private static final Set<TaskStatus> ALLOWED_NEXT =
            EnumSet.of(TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CANCELLED);

    private ReviewState() {}

    @Override
    public TaskStatus getStatus() {
        return TaskStatus.REVIEW;
    }

    @Override
    public Set<TaskStatus> allowedNext() {
        return ALLOWED_NEXT;
    }
}
