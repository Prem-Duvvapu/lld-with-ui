package com.lld.chess.exception;

import com.lld.config.DomainException;

/**
 * Base for every chess domain failure. Extends the shared DomainException so
 * GlobalExceptionHandler maps the whole hierarchy to real HTTP statuses.
 */
public class ChessException extends DomainException {
    public ChessException(String message) {
        super(message);
    }
}
