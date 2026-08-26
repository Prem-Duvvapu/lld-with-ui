package com.lld.elevator.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Thrown when a request references an elevator id that does not exist in the repository. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ElevatorNotFoundException extends ElevatorException {
    public ElevatorNotFoundException(long elevatorId) {
        super("No elevator with id " + elevatorId);
    }
}
