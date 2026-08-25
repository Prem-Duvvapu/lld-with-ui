package com.lld.vendingmachine.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
public class InsufficientPaymentException extends VendingMachineException {
    public InsufficientPaymentException(String message) {
        super(message);
    }
}
