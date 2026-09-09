package com.lld.logging.exception;

import com.lld.config.DomainException;

/** Base type for expected logging-framework failures handled by the shared error contract. */
public abstract class LoggingException extends DomainException {
    protected LoggingException(String message) {
        super(message);
    }
}
