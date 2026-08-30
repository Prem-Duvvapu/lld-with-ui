package com.lld.movieticket.exception;

import com.lld.config.DomainException;

/**
 * Base for every Movie Ticket Booking domain failure. Abstract (never thrown directly) so it
 * never needs its own {@code @ResponseStatus} and never has to be added to
 * {@code DomainExceptionContractTest}'s {@code BASES} allowlist — every concrete subclass below
 * carries its own status instead.
 *
 * <p>Previously this extended bare {@code RuntimeException} with a hand-rolled {@code errorCode}
 * field, and {@code MovieTicketController} caught each concrete subclass itself to hand-build a
 * {@code Map.of("error", e.getErrorCode(), "message", e.getMessage())} body — exactly the
 * duplicated, inconsistent-shape pattern {@link com.lld.config.GlobalExceptionHandler} exists to
 * replace. Extending {@link DomainException} and annotating each subclass with
 * {@code @ResponseStatus} lets the shared handler do this for free, in the standard
 * {@code ErrorResponse} shape every other module returns.
 */
public abstract class MovieTicketException extends DomainException {
    protected MovieTicketException(String message) {
        super(message);
    }
}
