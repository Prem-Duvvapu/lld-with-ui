package com.lld.concurrency.mergesort.exception;

import com.lld.config.DomainException;

/**
 * Base of this module's domain exception hierarchy. Abstract, so
 * {@code DomainExceptionContractTest}'s classpath scan (which excludes abstract
 * types, matching how {@link DomainException} itself is never instantiated
 * directly) never demands a {@code @ResponseStatus} on this class itself — only on
 * concrete subclasses.
 */
public abstract class MergeSortException extends DomainException {
    protected MergeSortException(String message) {
        super(message);
    }
}
