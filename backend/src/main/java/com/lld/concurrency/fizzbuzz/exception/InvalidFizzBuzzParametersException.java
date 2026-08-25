package com.lld.concurrency.fizzbuzz.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * A run was requested with an upper bound that can never produce a valid run —
 * non-positive, or large enough to blow the "seconds, not longer" run-time
 * budget. Always the caller's fault, hence 400.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidFizzBuzzParametersException extends FizzBuzzException {
    public InvalidFizzBuzzParametersException(String message) {
        super(message);
    }
}
