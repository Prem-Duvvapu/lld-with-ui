package com.lld.airline.exception;

public class FlightNotFoundException extends AirlineException {
    public FlightNotFoundException(String message) {
        super(message);
    }
}
