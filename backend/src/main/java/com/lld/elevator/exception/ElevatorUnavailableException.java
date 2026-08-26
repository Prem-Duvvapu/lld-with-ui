package com.lld.elevator.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an operation targets an elevator that cannot legally accept it right now — e.g. an
 * internal destination call on a car that is in {@code MAINTENANCE}.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ElevatorUnavailableException extends ElevatorException {
    public ElevatorUnavailableException(String message) {
        super(message);
    }
}
