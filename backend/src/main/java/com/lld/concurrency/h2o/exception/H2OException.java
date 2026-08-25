package com.lld.concurrency.h2o.exception;

import com.lld.config.DomainException;

/**
 * Base of this module's domain exception hierarchy. Abstract, so
 * {@code DomainExceptionContractTest}'s classpath scan never demands a
 * {@code @ResponseStatus} on this class itself — only on concrete subclasses.
 */
public abstract class H2OException extends DomainException {
    protected H2OException(String message) {
        super(message);
    }
}
