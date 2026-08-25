package com.lld.concurrency.fizzbuzz.exception;

import com.lld.config.DomainException;

/**
 * Base of this module's domain exception hierarchy. Abstract, so
 * {@code DomainExceptionContractTest}'s classpath scan never demands a
 * {@code @ResponseStatus} on this class itself — only on concrete subclasses.
 */
public abstract class FizzBuzzException extends DomainException {
    protected FizzBuzzException(String message) {
        super(message);
    }
}
