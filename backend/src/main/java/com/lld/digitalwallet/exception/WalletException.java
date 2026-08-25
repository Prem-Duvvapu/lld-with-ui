package com.lld.digitalwallet.exception;

import com.lld.config.DomainException;

/**
 * Base exception for the digital wallet module. No status of its own — every concrete
 * subclass carries the HTTP status; this class exists so callers can catch the whole
 * module hierarchy and so {@code GlobalExceptionHandler} recognises it as a domain
 * failure rather than a framework fault.
 */
public abstract class WalletException extends DomainException {
    protected WalletException(String message) {
        super(message);
    }
}
