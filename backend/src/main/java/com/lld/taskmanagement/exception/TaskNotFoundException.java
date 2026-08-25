package com.lld.taskmanagement.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class TaskNotFoundException extends TaskException {
    public TaskNotFoundException(long taskId) {
        super("Task not found: " + taskId);
    }
}
