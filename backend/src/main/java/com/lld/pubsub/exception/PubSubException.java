package com.lld.pubsub.exception;

import com.lld.config.DomainException;

/** Base of the pub-sub domain exception hierarchy. Never thrown directly. */
public abstract class PubSubException extends DomainException {
    protected PubSubException(String message) {
        super(message);
    }
}
