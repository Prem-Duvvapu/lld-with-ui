package com.lld.elevator.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown for a structurally invalid request that isn't simply an out-of-range floor — e.g. a
 * source floor equal to its own destination floor, or a missing/unrecognized dispatch policy.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidElevatorRequestException extends ElevatorException {
    public InvalidElevatorRequestException(String message) {
        super(message);
    }
}
