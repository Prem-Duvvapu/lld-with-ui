package com.lld.airline.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.GONE)
public class HoldExpiredException extends AirlineException {
    public HoldExpiredException(String message) {
        super(message);
    }
}
