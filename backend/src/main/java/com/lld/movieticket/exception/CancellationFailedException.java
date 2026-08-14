package com.lld.movieticket.exception;

public class CancellationFailedException extends MovieTicketException {
    public CancellationFailedException(String message) {
        super("CANCELLATION_FAILED", message);
    }
}
