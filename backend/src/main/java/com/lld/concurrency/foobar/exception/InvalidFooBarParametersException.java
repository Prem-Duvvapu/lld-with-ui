package com.lld.concurrency.foobar.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A run was requested with a repeat count that can never produce a valid run —
 * non-positive, or large enough to blow the "seconds, not longer" run-time
 * budget. Always the caller's fault, hence 400.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidFooBarParametersException extends FooBarException {
    public InvalidFooBarParametersException(String message) {
        super(message);
    }
}
