package com.lld.uber.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DriverUnavailableException extends UberException {
    public DriverUnavailableException(String message) {
        super(message);
    }
}
