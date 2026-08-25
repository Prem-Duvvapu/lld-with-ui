package com.lld.vendingmachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InsufficientChangeException extends VendingMachineException {
    public InsufficientChangeException(String message) {
        super(message);
    }
}
