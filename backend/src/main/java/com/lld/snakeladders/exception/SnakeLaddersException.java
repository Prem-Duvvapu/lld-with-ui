package com.lld.snakeladders.exception;

import com.lld.config.DomainException;

/**
 * Base for every Snake & Ladders domain failure. Abstract (never thrown directly) so it never
 * needs its own {@code @ResponseStatus} and never has to be added to
 * {@code DomainExceptionContractTest}'s {@code BASES} allowlist.
 */
public abstract class SnakeLaddersException extends DomainException {
    protected SnakeLaddersException(String message) {
        super(message);
    }
}
