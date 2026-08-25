package com.lld.vendingmachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidStateException extends VendingMachineException {
    public InvalidStateException(String message) {
        super(message);
    }
}
