package com.lld.airline.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class SeatNotAvailableException extends AirlineException {
    public SeatNotAvailableException(String message) {
        super(message);
    }
}
