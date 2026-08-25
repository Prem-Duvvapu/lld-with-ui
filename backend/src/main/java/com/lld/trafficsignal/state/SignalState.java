package com.lld.trafficsignal.state;

import com.lld.trafficsignal.model.LightState;

/**
 * State pattern for one traffic light's phase. Each concrete state knows the one phase it may
 * legally advance to and how long it holds before doing so — the legal-transition table is
 * therefore declared entirely by wiring ({@link RedState} only ever returns {@link GreenState},
 * etc.), not by an if/else chain scattered across callers.
 *
 * <p>The standard cycle is RED -&gt; GREEN -&gt; YELLOW -&gt; RED. Skipping a phase (e.g. RED
 * straight to YELLOW) is impossible to express through {@link #next()} since each singleton only
 * exposes the one legal successor; {@link com.lld.trafficsignal.model.TrafficLight#requestTransitionTo}
 * is the place a caller can still *ask* for an arbitrary phase, and it validates the request
 * against this same table, throwing {@link com.lld.trafficsignal.exception.IllegalSignalTransitionException}
 * for anything that is not the one legal next phase.
 */
public interface SignalState {
    LightState getPhase();

    /** How long this phase holds before automatically advancing, in seconds. */
    int getDurationSeconds();

    /** The only state this phase may legally advance to. */
    SignalState next();
}
