package com.lld.circuitbreaker.strategy;

import com.lld.circuitbreaker.model.CircuitBreaker;

/**
 * Strategy deciding when a {@link CircuitBreaker} in {@code CLOSED} should trip to {@code OPEN}.
 * Consulted by {@code ClosedState.onFailure} after every failed call; {@code CircuitBreaker}
 * itself never branches on which policy is in use.
 */
public interface TripPolicy {

    boolean shouldTrip(CircuitBreaker breaker);

    /** Human-readable summary for the UI — e.g. "3 consecutive failures". */
    String describe();
}
