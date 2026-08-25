package com.lld.concurrency.h2o.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A run was requested with a molecule count that can never produce a valid run —
 * non-positive, or large enough to blow the "seconds, not longer" run-time
 * budget. Always the caller's fault, hence 400.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidH2OParametersException extends H2OException {
    public InvalidH2OParametersException(String message) {
        super(message);
    }
}
