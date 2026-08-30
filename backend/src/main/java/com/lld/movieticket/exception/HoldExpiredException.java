package com.lld.movieticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The caller's seat hold's TTL elapsed before they confirmed the booking. */
@ResponseStatus(HttpStatus.GONE)
public class HoldExpiredException extends MovieTicketException {
    public HoldExpiredException(String message) {
        super(message);
    }
}
