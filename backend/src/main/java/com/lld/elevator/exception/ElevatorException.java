package com.lld.elevator.exception;

import com.lld.config.DomainException;

/** Base of the elevator domain exception hierarchy. Never thrown directly. */
public abstract class ElevatorException extends DomainException {
    protected ElevatorException(String message) {
        super(message);
    }
}
