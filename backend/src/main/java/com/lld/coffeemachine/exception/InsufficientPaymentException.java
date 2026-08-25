package com.lld.coffeemachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InsufficientPaymentException extends CoffeeMachineException {
    public InsufficientPaymentException(String message) {
        super(message);
    }
}
