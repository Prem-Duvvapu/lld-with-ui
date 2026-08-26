package com.lld.concurrency.mergesort.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A run was requested with parameters that can never produce a valid run —
 * non-positive size/parallelism/sequentialThreshold, values large enough to blow
 * the "seconds, not longer" run-time budget, or a supplied array whose length
 * disagrees with an explicitly supplied size. Always the caller's fault, hence 400.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidSortParametersException extends MergeSortException {
    public InvalidSortParametersException(String message) {
        super(message);
    }
}
