package com.lld.concertticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class VenueNotFoundException extends ConcertTicketException {
    public VenueNotFoundException(String message) {
        super(message);
    }
}
