package com.lld.coffeemachine.exception;

public class InvalidStateOperationException extends RuntimeException {
    public InvalidStateOperationException(String message) {
        super(message);
    }
}
