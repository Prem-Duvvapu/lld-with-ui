package com.lld.airline.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidCancellationException extends AirlineException {
    public InvalidCancellationException(String message) {
        super(message);
    }
}
