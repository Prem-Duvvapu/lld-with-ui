package com.lld.atm.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class InsufficientCashException extends AtmException {
    public InsufficientCashException(String message) {
        super(message);
    }
}
