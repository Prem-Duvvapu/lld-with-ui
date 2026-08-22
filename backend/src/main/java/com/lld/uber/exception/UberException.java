package com.lld.uber.exception;

import com.lld.config.DomainException;

/**
 * Base for every Uber domain failure. Extends the shared DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses.
 */
public class UberException extends DomainException {
    public UberException(String message) {
        super(message);
    }
}
