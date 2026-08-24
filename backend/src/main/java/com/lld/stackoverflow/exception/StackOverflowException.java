package com.lld.stackoverflow.exception;

import com.lld.config.DomainException;

/**
 * Base for every StackOverflow domain failure. Extends DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses instead
 * of a bare 500 with the message stripped.
 */
public abstract class StackOverflowException extends DomainException {
    protected StackOverflowException(String message) {
        super(message);
    }
}
