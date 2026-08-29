package com.lld.atm.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidSessionStateException extends AtmException {
    public InvalidSessionStateException(String message) {
        super(message);
    }
}
