package com.lld.coffeemachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidStateOperationException extends CoffeeMachineException {
    public InvalidStateOperationException(String message) {
        super(message);
    }
}
