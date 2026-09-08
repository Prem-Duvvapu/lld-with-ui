package com.lld.coupon.exception;

import com.lld.config.DomainException;

/**
 * Abstract — matches {@code kvstore.exception.KvStoreException}'s precedent, so the base class
 * needs no {@code @ResponseStatus} of its own and never has to be added to
 * {@code DomainExceptionContractTest}'s hardcoded {@code BASES} allowlist.
 */
public abstract class CouponException extends DomainException {
    protected CouponException(String message) {
        super(message);
    }
}
