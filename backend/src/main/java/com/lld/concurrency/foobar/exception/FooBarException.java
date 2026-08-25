package com.lld.concurrency.foobar.exception;

import com.lld.config.DomainException;

/**
 * Base of this module's domain exception hierarchy. Abstract, so
 * {@code DomainExceptionContractTest}'s classpath scan never demands a
 * {@code @ResponseStatus} on this class itself — only on concrete subclasses.
 */
public abstract class FooBarException extends DomainException {
    protected FooBarException(String message) {
        super(message);
    }
}
