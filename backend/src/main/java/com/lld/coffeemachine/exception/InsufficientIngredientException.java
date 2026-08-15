package com.lld.coffeemachine.exception;

public class InsufficientIngredientException extends RuntimeException {
    public InsufficientIngredientException(String message) {
        super(message);
    }
}
