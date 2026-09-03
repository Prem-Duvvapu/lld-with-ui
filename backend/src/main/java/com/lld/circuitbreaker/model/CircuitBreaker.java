package com.lld.circuitbreaker.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.lld.circuitbreaker.clock.Clock;
import com.lld.circuitbreaker.exception.CircuitOpenException;
import com.lld.circuitbreaker.state.CircuitState;
import com.lld.circuitbreaker.state.ClosedState;
import com.lld.circuitbreaker.state.HalfOpenState;
import com.lld.circuitbreaker.strategy.TripPolicy;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

/**
 * One named circuit breaker, guarding calls to a single downstream dependency. Delegates its
 * phase to a {@link CircuitState} instance (State pattern, same idiom as
 * {@code trafficsignal.model.TrafficLight}) rather than branching on an enum at every call site:
 * {@code CLOSED} lets every call through and counts failures; {@code OPEN} rejects every call
 * immediately, with no downstream attempt at all, until the cooldown has elapsed; {@code
 * HALF_OPEN} then lets exactly one trial call through, closing the circuit on success or
 * reopening it (restarting the cooldown) on failure.
 *
 * <p>{@link #lock} is held for the *entire* {@link #attemptCall}, including any state transition
 * it triggers — deliberately, since that is what guarantees exactly one trial call is ever in
 * flight during {@code HALF_OPEN}: a second caller arriving while a trial is resolving simply
 * blocks until that trial has already moved the breaker to {@code CLOSED} or back to {@code
 * OPEN}, so it never itself observes {@code HALF_OPEN}. A breaker guarding a slow real network
 * call would need a separate permit instead of holding a lock across the downstream call itself —
 * here the "call" is instantaneous (the caller supplies its own outcome; see {@link
 * #attemptCall}), so holding the lock for the whole operation is a deliberate, safe choice, not a
 * bottleneck accidentally left in place.
 */
public class CircuitBreaker {
    private final String name;
    private final TripPolicy tripPolicy;
    private final long cooldownMillis;
    private final int windowCapacity;
    private final ReentrantLock lock = new ReentrantLock();

    @JsonIgnore
    private final Clock clock;

    private volatile CircuitState state = ClosedState.INSTANCE;
    private int consecutiveFailures = 0;
    private final Deque<Boolean> recentResults = new ArrayDeque<>();
    private volatile long openedAtMillis = 0L;
    private volatile long totalCalls = 0L;
    private volatile long totalRejections = 0L;

    public CircuitBreaker(String name, TripPolicy tripPolicy, long cooldownMillis, int windowCapacity, Clock clock) {
        this.name = name;
        this.tripPolicy = tripPolicy;
        this.cooldownMillis = cooldownMillis;
        this.windowCapacity = windowCapacity;
        this.clock = clock;
    }

    /**
     * Attempts one call, with {@code simulateSuccess} standing in for whatever a real downstream
     * call would have returned — this module is a pure LLD demonstration of the breaker's own
     * logic, not a network client, so the caller (not a real dependency) decides the outcome.
     * Throws {@link CircuitOpenException} without incrementing {@link #totalCalls} if the breaker
     * is not currently allowing calls.
     */
    public CallOutcome attemptCall(boolean simulateSuccess) {
        lock.lock();
        try {
            if (state.getPhase() == CircuitPhase.OPEN && cooldownElapsed()) {
                transitionTo(HalfOpenState.INSTANCE);
            }
            if (!state.allowCall()) {
                totalRejections++;
                throw new CircuitOpenException("Circuit '" + name
                        + "' is OPEN — call rejected without attempting the downstream call. "
                        + "Retry after the cooldown elapses.");
            }
            totalCalls++;
            if (simulateSuccess) {
                state.onSuccess(this);
            } else {
                state.onFailure(this);
            }
            return CallOutcome.builder()
                    .serviceName(name)
                    .attempted(true)
                    .callSucceeded(simulateSuccess)
                    .phase(state.getPhase())
                    .build();
        } finally {
            lock.unlock();
        }
    }

    private boolean cooldownElapsed() {
        return clock.millis() - openedAtMillis >= cooldownMillis;
    }

    // =========================================================================
    // Package-external mutators for CircuitState implementations (com.lld.circuitbreaker.state).
    // Not for general use — calling these outside a CircuitState is how the "exactly one active
    // phase" invariant breaks.
    // =========================================================================

    public void transitionTo(CircuitState newState) {
        this.state = newState;
        if (newState.getPhase() == CircuitPhase.OPEN) {
            this.openedAtMillis = clock.millis();
        } else if (newState.getPhase() == CircuitPhase.CLOSED) {
            this.consecutiveFailures = 0;
            this.recentResults.clear();
        }
    }

    public void incrementConsecutiveFailures() {
        this.consecutiveFailures++;
    }

    public void resetConsecutiveFailures() {
        this.consecutiveFailures = 0;
    }

    public void pushResult(boolean success) {
        recentResults.addLast(success);
        while (recentResults.size() > windowCapacity) {
            recentResults.removeFirst();
        }
    }

    // =========================================================================
    // Read-only accessors
    // =========================================================================

    public String getName() {
        return name;
    }

    public CircuitPhase getPhase() {
        return state.getPhase();
    }

    public TripPolicy getTripPolicy() {
        return tripPolicy;
    }

    public int getConsecutiveFailures() {
        return consecutiveFailures;
    }

    public List<Boolean> getRecentResults() {
        lock.lock();
        try {
            return new ArrayList<>(recentResults);
        } finally {
            lock.unlock();
        }
    }

    public double getFailureRate() {
        List<Boolean> window = getRecentResults();
        if (window.isEmpty()) {
            return 0.0;
        }
        long failures = window.stream().filter(success -> !success).count();
        return (double) failures / window.size();
    }

    public long getCooldownMillis() {
        return cooldownMillis;
    }

    public long getOpenedAtMillis() {
        return openedAtMillis;
    }

    /** Milliseconds left before a call would move an OPEN breaker to HALF_OPEN; 0 outside OPEN. */
    public long getRemainingCooldownMillis() {
        if (state.getPhase() != CircuitPhase.OPEN) {
            return 0L;
        }
        return Math.max(0L, cooldownMillis - (clock.millis() - openedAtMillis));
    }

    public long getTotalCalls() {
        return totalCalls;
    }

    public long getTotalRejections() {
        return totalRejections;
    }
}
