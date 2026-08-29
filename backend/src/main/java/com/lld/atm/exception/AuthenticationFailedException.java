package com.lld.atm.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class AuthenticationFailedException extends AtmException {
    public AuthenticationFailedException(String message) {
        super(message);
    }
}
