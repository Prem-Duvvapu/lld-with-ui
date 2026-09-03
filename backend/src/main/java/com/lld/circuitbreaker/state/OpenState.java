package com.lld.circuitbreaker.state;

import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.CircuitPhase;

/**
 * Every call is rejected immediately, with no downstream attempt at all — the whole point of
 * tripping. {@link CircuitBreaker#attemptCall} checks whether the cooldown has elapsed and moves
 * to {@link HalfOpenState} *before* consulting {@link #allowCall()}, so this state's own
 * {@code allowCall()} only ever answers "cooldown has not elapsed yet".
 */
public final class OpenState implements CircuitState {
    public static final OpenState INSTANCE = new OpenState();

    private OpenState() {}

    @Override
    public CircuitPhase getPhase() {
        return CircuitPhase.OPEN;
    }

    @Override
    public boolean allowCall() {
        return false;
    }

    @Override
    public void onSuccess(CircuitBreaker breaker) {
        // Unreachable: allowCall() is false, so CircuitBreaker.attemptCall() never calls this
        // while the breaker is OPEN. Implemented only for interface completeness.
    }

    @Override
    public void onFailure(CircuitBreaker breaker) {
        // Unreachable — see onSuccess.
    }
}
