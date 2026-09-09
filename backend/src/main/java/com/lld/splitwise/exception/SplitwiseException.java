package com.lld.splitwise.exception;

import com.lld.config.DomainException;

/** Base type for expected Splitwise domain failures handled by the shared error contract. */
public abstract class SplitwiseException extends DomainException {
    protected SplitwiseException(String message) {
        super(message);
    }
}
