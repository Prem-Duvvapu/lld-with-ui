package com.lld.movieticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The seats were legally held/available but the booking could not be completed (e.g. payment failed). */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class BookingFailedException extends MovieTicketException {
    public BookingFailedException(String message) {
        super(message);
    }
}
