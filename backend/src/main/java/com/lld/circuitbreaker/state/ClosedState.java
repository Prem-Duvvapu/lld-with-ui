package com.lld.circuitbreaker.state;

import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.CircuitPhase;

/** Every call is let through. A success resets the failure count; a failure counts toward the breaker's {@code TripPolicy}, tripping to {@link OpenState} the moment it says to. */
public final class ClosedState implements CircuitState {
    public static final ClosedState INSTANCE = new ClosedState();

    private ClosedState() {}

    @Override
    public CircuitPhase getPhase() {
        return CircuitPhase.CLOSED;
    }

    @Override
    public boolean allowCall() {
        return true;
    }

    @Override
    public void onSuccess(CircuitBreaker breaker) {
        breaker.resetConsecutiveFailures();
        breaker.pushResult(true);
    }

    @Override
    public void onFailure(CircuitBreaker breaker) {
        breaker.incrementConsecutiveFailures();
        breaker.pushResult(false);
        if (breaker.getTripPolicy().shouldTrip(breaker)) {
            breaker.transitionTo(OpenState.INSTANCE);
        }
    }
}
