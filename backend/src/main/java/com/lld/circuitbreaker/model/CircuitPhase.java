package com.lld.circuitbreaker.model;

/** The three phases a circuit breaker can be in. See {@code CircuitState} for the behavior each one implements. */
public enum CircuitPhase {
    CLOSED, OPEN, HALF_OPEN
}
