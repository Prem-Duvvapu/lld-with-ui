package com.lld.auction.exception;

import com.lld.config.DomainException;

/**
 * Base exception for the auction module. No status of its own — every concrete subclass carries
 * the HTTP status; this class exists so callers can catch the whole module hierarchy and so
 * {@code GlobalExceptionHandler} can recognise it. Abstract, so
 * {@code DomainExceptionContractTest}'s classpath scan excludes it automatically (Spring's
 * component scanner never returns abstract classes) — no manual allowlist entry needed, the same
 * shape as {@code InventoryException}.
 */
public abstract class AuctionException extends DomainException {
    protected AuctionException(String message) {
        super(message);
    }
}
