package com.lld.airline.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class BookingFailedException extends AirlineException {
    public BookingFailedException(String message) {
        super(message);
    }
}
