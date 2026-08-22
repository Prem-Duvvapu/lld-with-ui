package com.lld.uber.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class RideNotFoundException extends UberException {
    public RideNotFoundException(String message) {
        super(message);
    }
}
