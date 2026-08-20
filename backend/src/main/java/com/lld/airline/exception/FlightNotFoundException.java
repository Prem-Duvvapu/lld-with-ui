package com.lld.airline.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class FlightNotFoundException extends AirlineException {
    public FlightNotFoundException(String message) {
        super(message);
    }
}
