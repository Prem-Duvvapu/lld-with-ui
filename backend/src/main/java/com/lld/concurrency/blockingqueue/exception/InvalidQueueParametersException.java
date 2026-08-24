package com.lld.concurrency.blockingqueue.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A run was requested with parameters that can never produce a valid run —
 * non-positive capacity/thread counts, or values large enough to blow the
 * "seconds, not longer" run-time budget. Always the caller's fault, hence 400.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidQueueParametersException extends BlockingQueueException {
    public InvalidQueueParametersException(String message) {
        super(message);
    }
}
