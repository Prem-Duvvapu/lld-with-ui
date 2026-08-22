package com.lld.uber.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidRideTransitionException extends UberException {
    public InvalidRideTransitionException(String message) {
        super(message);
    }
}
