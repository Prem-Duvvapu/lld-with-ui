package com.lld.concertticket.exception;

import com.lld.config.DomainException;

/**
 * Base of the concert-ticket domain exception hierarchy. Every concrete subclass
 * carries {@code @ResponseStatus} and none map to 5xx — enforced by
 * {@code DomainExceptionContractTest}.
 */
public class ConcertTicketException extends DomainException {
    public ConcertTicketException(String message) {
        super(message);
    }
}
