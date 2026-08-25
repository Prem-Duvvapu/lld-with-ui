package com.lld.coffeemachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class InvalidCoffeeTypeException extends CoffeeMachineException {
    public InvalidCoffeeTypeException(String message) {
        super(message);
    }
}
