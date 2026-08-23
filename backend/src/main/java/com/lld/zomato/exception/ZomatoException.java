package com.lld.zomato.exception;

import com.lld.config.DomainException;

/**
 * Base for every Zomato domain failure. Extends DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses.
 */
public class ZomatoException extends DomainException {
    public ZomatoException(String message) {
        super(message);
    }
}
