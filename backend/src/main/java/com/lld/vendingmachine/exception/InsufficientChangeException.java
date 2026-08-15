package com.lld.vendingmachine.exception;

public class InsufficientChangeException extends RuntimeException {
    public InsufficientChangeException(String message) {
        super(message);
    }
}
