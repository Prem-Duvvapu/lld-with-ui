package com.lld.locker.exception;

import com.lld.config.DomainException;

/**
 * Abstract — matches {@code shoppingcart.exception.ShoppingCartException}'s precedent, so the
 * base class needs no {@code @ResponseStatus} of its own and never has to be added to
 * {@code DomainExceptionContractTest}'s hardcoded {@code BASES} allowlist (that list exists only
 * for module bases that are *not* abstract).
 */
public abstract class LockerException extends DomainException {
    protected LockerException(String message) {
        super(message);
    }
}
