package com.lld.taskmanagement.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a requested status change is not one of the current status's legally declared
 * next statuses — e.g. asking a TODO task to jump straight to DONE instead of going through
 * IN_PROGRESS and REVIEW first. See {@code com.lld.taskmanagement.state.TaskState} for the
 * declared transition table.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IllegalTaskTransitionException extends TaskException {
    public IllegalTaskTransitionException(String message) {
        super(message);
    }
}
