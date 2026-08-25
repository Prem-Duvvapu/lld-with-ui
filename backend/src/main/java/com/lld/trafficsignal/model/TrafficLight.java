package com.lld.trafficsignal.model;

import com.lld.trafficsignal.exception.IllegalSignalTransitionException;
import com.lld.trafficsignal.state.RedState;
import com.lld.trafficsignal.state.SignalState;

/**
 * One signal head at an intersection. Its phase is delegated to a {@link SignalState} instance
 * instead of a directly-mutated {@link LightState} enum field, so "what can this light legally do
 * next" lives in one place (the state classes) rather than being re-derived at every call site.
 *
 * <p>Mutation is package-private: only {@link Intersection}, which owns the lock coordinating
 * this light with its siblings (only one may be GREEN/YELLOW at a time), may change a light's
 * phase.
 */
public class TrafficLight {
    private final int id;
    private final String position;
    private volatile SignalState state;
    private volatile int remainingSeconds;

    public TrafficLight(int id, String position) {
        this.id = id;
        this.position = position;
        this.state = RedState.INSTANCE;
        this.remainingSeconds = state.getDurationSeconds();
    }

    public int getId() {
        return id;
    }

    public String getPosition() {
        return position;
    }

    public LightState getCurrentState() {
        return state.getPhase();
    }

    public int getTimer() {
        return remainingSeconds;
    }

    SignalState state() {
        return state;
    }

    /** Unconditionally sets the phase and resets the countdown to that phase's duration. Bypasses
     *  the legal-transition table — reserved for {@link Intersection}'s auto-advance and emergency
     *  override, which have their own, documented rules about when a bypass is warranted. */
    void forceState(SignalState newState) {
        this.state = newState;
        this.remainingSeconds = newState.getDurationSeconds();
    }

    /** Decrements the countdown by one second (floored at zero). Returns true once it hits zero. */
    boolean decrementAndCheckExpired() {
        if (remainingSeconds > 0) {
            remainingSeconds--;
        }
        return remainingSeconds == 0;
    }

    /**
     * Validates {@code requested} against this light's one legal next phase and applies it if
     * legal — the enforcement point for "reject illegal jumps".
     */
    void requestTransitionTo(LightState requested) {
        SignalState legalNext = state.next();
        if (legalNext.getPhase() != requested) {
            throw new IllegalSignalTransitionException(
                    "Light " + id + " (" + position + ") cannot go from " + state.getPhase()
                            + " to " + requested + " — the only legal next phase is " + legalNext.getPhase() + ".");
        }
        forceState(legalNext);
    }
}
