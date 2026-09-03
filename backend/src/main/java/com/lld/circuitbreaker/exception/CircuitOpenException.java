package com.lld.circuitbreaker.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a call is rejected because the breaker is OPEN (or is HALF_OPEN and a trial call
 * is already resolving). 409, not 5xx: the breaker itself did not fail — it is doing exactly its
 * job of refusing to attempt a call it has decided not to trust yet, which is the caller's state
 * to react to (back off, fall back), not a server fault. {@code DomainExceptionContractTest}
 * enforces that no domain exception maps to a 5xx.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class CircuitOpenException extends CircuitBreakerException {
    public CircuitOpenException(String message) {
        super(message);
    }
}
