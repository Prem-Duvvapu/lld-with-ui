package com.lld.movieticket.exception;

public class HoldExpiredException extends MovieTicketException {
    public HoldExpiredException(String message) {
        super("HOLD_EXPIRED", message);
    }
}
