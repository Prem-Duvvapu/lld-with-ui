package com.lld.workflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class WorkflowNotFoundException extends WorkflowException {
    public WorkflowNotFoundException(String message) {
        super(message);
    }
}
