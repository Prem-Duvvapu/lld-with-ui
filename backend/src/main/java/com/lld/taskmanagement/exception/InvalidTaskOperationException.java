package com.lld.taskmanagement.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Malformed request: blank title, unknown enum value, unknown ordering policy, bad race params. */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidTaskOperationException extends TaskException {
    public InvalidTaskOperationException(String message) {
        super(message);
    }
}
