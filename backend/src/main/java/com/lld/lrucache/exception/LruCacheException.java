package com.lld.lrucache.exception;

import com.lld.config.DomainException;

/**
 * Base for every LRU-cache domain failure. Abstract (never thrown directly) so it never needs
 * its own {@code @ResponseStatus} and never has to be added to
 * {@code DomainExceptionContractTest}'s {@code BASES} allowlist.
 */
public abstract class LruCacheException extends DomainException {
    protected LruCacheException(String message) {
        super(message);
    }
}
