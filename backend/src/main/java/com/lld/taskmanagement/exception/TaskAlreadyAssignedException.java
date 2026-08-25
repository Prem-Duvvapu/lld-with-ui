package com.lld.taskmanagement.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown by {@code claimTask} when a second actor tries to claim a task another actor already
 * claimed. This is the assignment-race guard: {@code TaskConcurrencyTest} fires N actors at one
 * unassigned task and asserts exactly one claim lands, the rest land here.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class TaskAlreadyAssignedException extends TaskException {
    public TaskAlreadyAssignedException(long taskId, String currentAssignee) {
        super("Task " + taskId + " is already assigned to " + currentAssignee + ".");
    }
}
