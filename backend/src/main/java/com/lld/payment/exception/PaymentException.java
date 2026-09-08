package com.lld.payment.exception;

import com.lld.config.DomainException;

/**
 * Abstract — matches {@code shoppingcart.exception.ShoppingCartException} / this portfolio's
 * {@code locker.exception.LockerException} precedent, so the base class needs no
 * {@code @ResponseStatus} of its own and never has to be added to
 * {@code DomainExceptionContractTest}'s hardcoded {@code BASES} allowlist.
 */
public abstract class PaymentException extends DomainException {
    protected PaymentException(String message) {
        super(message);
    }
}
