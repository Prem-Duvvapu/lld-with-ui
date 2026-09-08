package com.lld.workflow.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 403 — the acting approver's role doesn't match the role required for the current pending step. */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class UnauthorizedApproverException extends WorkflowException {
    public UnauthorizedApproverException(String message) {
        super(message);
    }
}
