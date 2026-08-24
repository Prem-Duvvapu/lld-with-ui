package com.lld.concertticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class BookingNotFoundException extends ConcertTicketException {
    public BookingNotFoundException(String message) {
        super(message);
    }
}
