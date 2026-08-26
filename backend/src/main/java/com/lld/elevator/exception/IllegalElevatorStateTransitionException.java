package com.lld.elevator.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when code asks an {@link com.lld.elevator.model.Elevator} to move to a state that is not
 * in the current state's declared {@code allowedNext()} set. See
 * {@code com.lld.elevator.state.ElevatorLifecycleState} for the transition table.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class IllegalElevatorStateTransitionException extends ElevatorException {
    public IllegalElevatorStateTransitionException(String message) {
        super(message);
    }
}
