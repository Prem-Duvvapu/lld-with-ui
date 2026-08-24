package com.lld.concertticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a booking is confirmed after its 10-minute seat hold has already expired.
 * 410 GONE — the resource (the hold) existed and is no longer retrievable, as opposed
 * to 404 (never existed) or 409 (currently contested).
 */
@ResponseStatus(HttpStatus.GONE)
public class HoldExpiredException extends ConcertTicketException {
    public HoldExpiredException(String message) {
        super(message);
    }
}
