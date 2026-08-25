package com.lld.taskmanagement.model;

import com.lld.taskmanagement.exception.IllegalTaskTransitionException;
import com.lld.taskmanagement.state.TaskState;
import com.lld.taskmanagement.state.TaskStates;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A unit of work on a {@link Board}. {@link #transitionTo(TaskStatus)} is the single place
 * status ever changes — it delegates the legality check to the {@link TaskState} for the current
 * status, mirroring {@code TrafficLight#requestTransitionTo}. Callers (the service layer) hold a
 * per-task lock around this call so the check and the write are atomic under concurrency; see
 * {@code TaskConcurrencyTest}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {
    private long id;
    private int boardId;
    private String title;
    private String description;
    private TaskStatus status;
    private Priority priority;
    private String assignee;
    /** Epoch millis deadline, or {@code null} for "no due date". */
    private Long dueDate;
    private long createdAt;
    private long updatedAt;

    /**
     * Validates {@code target} against this task's current status's declared legal-next set and
     * applies it if legal. Throws {@link IllegalTaskTransitionException} otherwise — the
     * enforcement point for "reject illegal jumps" required of the state machine.
     */
    public void transitionTo(TaskStatus target) {
        TaskState current = TaskStates.of(this.status);
        if (!current.canTransitionTo(target)) {
            throw new IllegalTaskTransitionException(
                    "Task " + id + " (\"" + title + "\") cannot move from " + status + " to " + target
                            + " — legal next statuses are " + current.allowedNext() + ".");
        }
        this.status = target;
        this.updatedAt = System.currentTimeMillis();
    }
}
