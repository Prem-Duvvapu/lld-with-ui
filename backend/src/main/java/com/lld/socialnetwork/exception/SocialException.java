package com.lld.socialnetwork.exception;

import com.lld.config.DomainException;

/**
 * Base exception for the social-network module. No status of its own — every
 * concrete subclass carries the HTTP status via {@code @ResponseStatus}; this
 * class exists so callers can catch the whole module hierarchy and so
 * {@code GlobalExceptionHandler} recognises it as a domain failure.
 *
 * <p>Abstract, like {@code InventoryException} and {@code TrafficSignalException} —
 * {@code DomainExceptionContractTest} only requires module bases named in its
 * explicit allowlist to stay concrete, and an abstract base is excluded from the
 * "every concrete exception declares a status" scan automatically.
 */
public abstract class SocialException extends DomainException {
    protected SocialException(String message) {
        super(message);
    }
}
