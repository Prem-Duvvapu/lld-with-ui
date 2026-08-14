package com.lld.movieticket.exception;

public class InvalidShowException extends MovieTicketException {
    public InvalidShowException(String message) {
        super("INVALID_SHOW", message);
    }
}
