package com.lld.circuitbreaker.exception;

import com.lld.config.DomainException;

/** Base of the circuit-breaker domain exception hierarchy. Never thrown directly. */
public class CircuitBreakerException extends DomainException {
    public CircuitBreakerException(String message) {
        super(message);
    }
}
