package com.lld.kvstore.exception;

import com.lld.config.DomainException;

/**
 * Abstract — matches {@code webcrawler.exception.WebCrawlerException}'s precedent, so the base
 * class needs no {@code @ResponseStatus} of its own and never has to be added to
 * {@code DomainExceptionContractTest}'s hardcoded {@code BASES} allowlist.
 */
public abstract class KvStoreException extends DomainException {
    protected KvStoreException(String message) {
        super(message);
    }
}
