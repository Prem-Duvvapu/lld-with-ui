package com.lld.movieticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The booking cannot be cancelled in its current state (e.g. already cancelled). */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class CancellationFailedException extends MovieTicketException {
    public CancellationFailedException(String message) {
        super(message);
    }
}
