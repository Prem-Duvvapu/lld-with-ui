package com.lld.hotel.exception;

import com.lld.config.DomainException;

/**
 * Base for every hotel domain failure. Extends the shared DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses instead
 * of a bare 500 with the message stripped.
 */
public class HotelException extends DomainException {
    public HotelException(String message) {
        super(message);
    }
}
