package com.lld.circuitbreaker.state;

import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.CircuitPhase;

/**
 * Exactly one trial call is let through: success means the downstream has recovered, so the
 * breaker closes; failure means it has not, so the breaker reopens (restarting the cooldown).
 * "Exactly one" is guaranteed by {@link CircuitBreaker#attemptCall} holding its lock across the
 * whole operation — see that method's javadoc for why that is deliberate here.
 */
public final class HalfOpenState implements CircuitState {
    public static final HalfOpenState INSTANCE = new HalfOpenState();

    private HalfOpenState() {}

    @Override
    public CircuitPhase getPhase() {
        return CircuitPhase.HALF_OPEN;
    }

    @Override
    public boolean allowCall() {
        return true;
    }

    @Override
    public void onSuccess(CircuitBreaker breaker) {
        breaker.transitionTo(ClosedState.INSTANCE);
    }

    @Override
    public void onFailure(CircuitBreaker breaker) {
        breaker.pushResult(false);
        breaker.transitionTo(OpenState.INSTANCE);
    }
}
