package com.lld.airline.exception;

public class SeatNotAvailableException extends AirlineException {
    public SeatNotAvailableException(String message) {
        super(message);
    }
}
