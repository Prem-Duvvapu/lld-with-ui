package com.lld.airline.exception;

import com.lld.config.DomainException;

public class AirlineException extends DomainException {
    public AirlineException(String message) {
        super(message);
    }
}
