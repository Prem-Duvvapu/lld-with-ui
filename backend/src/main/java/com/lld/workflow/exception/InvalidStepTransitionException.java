package com.lld.workflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidStepTransitionException extends WorkflowException {
    public InvalidStepTransitionException(String message) {
        super(message);
    }
}
