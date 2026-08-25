package com.lld.vendingmachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class OutOfStockException extends VendingMachineException {
    public OutOfStockException(String message) {
        super(message);
    }
}
