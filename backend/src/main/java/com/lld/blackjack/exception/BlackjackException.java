package com.lld.blackjack.exception;

import com.lld.config.DomainException;

/**
 * Abstract — matches {@code coupon.exception.CouponException}'s precedent, so the base class
 * needs no {@code @ResponseStatus} of its own and never has to be added to
 * {@code DomainExceptionContractTest}'s hardcoded {@code BASES} allowlist.
 */
public abstract class BlackjackException extends DomainException {
    protected BlackjackException(String message) {
        super(message);
    }
}
