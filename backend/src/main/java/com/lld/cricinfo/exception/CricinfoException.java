package com.lld.cricinfo.exception;

import com.lld.config.DomainException;

/**
 * Base for every CricInfo domain failure. Extends DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses.
 */
public class CricinfoException extends DomainException {
    public CricinfoException(String message) {
        super(message);
    }
}
