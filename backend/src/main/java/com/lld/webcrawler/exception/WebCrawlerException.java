package com.lld.webcrawler.exception;

import com.lld.config.DomainException;

/**
 * Abstract — matches {@code locker.exception.LockerException}'s precedent, so the base class
 * needs no {@code @ResponseStatus} of its own and never has to be added to
 * {@code DomainExceptionContractTest}'s hardcoded {@code BASES} allowlist.
 */
public abstract class WebCrawlerException extends DomainException {
    protected WebCrawlerException(String message) {
        super(message);
    }
}
