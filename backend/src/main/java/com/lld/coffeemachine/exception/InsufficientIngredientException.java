package com.lld.coffeemachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InsufficientIngredientException extends CoffeeMachineException {
    public InsufficientIngredientException(String message) {
        super(message);
    }
}
