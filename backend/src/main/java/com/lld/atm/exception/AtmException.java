package com.lld.atm.exception;

import com.lld.config.DomainException;

/**
 * Base of the ATM domain exception hierarchy, matching {@code com.lld.pubsub.exception.PubSubException}.
 * Never thrown directly — every concrete subclass carries its own {@code @ResponseStatus}, read by
 * {@link com.lld.config.GlobalExceptionHandler} via {@code AnnotationUtils}.
 */
public abstract class AtmException extends DomainException {
    protected AtmException(String message) {
        super(message);
    }
}
