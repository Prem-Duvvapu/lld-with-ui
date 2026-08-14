package com.lld.movieticket.exception;

public class BookingFailedException extends MovieTicketException {
    public BookingFailedException(String message) {
        super("BOOKING_FAILED", message);
    }
}
