package com.lld.movieticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** The requested movie/show id does not exist. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class InvalidShowException extends MovieTicketException {
    public InvalidShowException(String message) {
        super(message);
    }
}
