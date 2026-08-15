package com.lld.coffeemachine.exception;

public class InvalidCoffeeTypeException extends RuntimeException {
    public InvalidCoffeeTypeException(String message) {
        super(message);
    }
}
