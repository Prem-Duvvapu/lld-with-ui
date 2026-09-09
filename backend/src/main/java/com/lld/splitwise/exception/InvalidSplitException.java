package com.lld.splitwise.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The request is syntactically valid, but its split allocation violates a domain rule. */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class InvalidSplitException extends SplitwiseException {
    public InvalidSplitException(String message) {
        super(message);
    }
}
