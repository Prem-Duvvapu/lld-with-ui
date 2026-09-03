package com.lld.circuitbreaker.state;

import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.CircuitPhase;

/**
 * State pattern for one circuit breaker's phase — same idiom as
 * {@code trafficsignal.state.SignalState}, except each state here actively drives the breaker's
 * transitions itself ({@link #onSuccess}/{@link #onFailure} call back into
 * {@link CircuitBreaker}'s package-visible mutators) rather than the context reading a
 * {@code next()} chain, since "what should happen next" genuinely depends on the call's outcome,
 * not on a fixed successor.
 */
public interface CircuitState {

    CircuitPhase getPhase();

    /** Whether a call may even be attempted while in this phase. */
    boolean allowCall();

    /** Called when an attempted call succeeded. Only ever invoked when {@link #allowCall()} was true. */
    void onSuccess(CircuitBreaker breaker);

    /** Called when an attempted call failed. Only ever invoked when {@link #allowCall()} was true. */
    void onFailure(CircuitBreaker breaker);
}
