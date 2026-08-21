package com.lld.uber;

import com.lld.uber.model.RideStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static com.lld.uber.model.RideStatus.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * The transition table is the module's state machine. Before it existed each service
 * method carried its own idea of which source states were acceptable, and nothing
 * stopped a move out of a terminal state — so these are the guards for that whole class
 * of bug.
 */
@DisplayName("Uber Ride State Machine")
class RideStatusTest {

    @Test
    @DisplayName("Happy path: the full REQUESTED to COMPLETED walk is legal end to end")
    void happyPathIsLegal() {
        assertTrue(REQUESTED.canTransitionTo(ACCEPTED));
        assertTrue(ACCEPTED.canTransitionTo(ONGOING));
        assertTrue(ONGOING.canTransitionTo(DESTINATION_REACHED));
        assertTrue(DESTINATION_REACHED.canTransitionTo(PAYMENT_PENDING));
        assertTrue(PAYMENT_PENDING.canTransitionTo(COMPLETED));
    }

    @Test
    @DisplayName("Terminal states are dead ends: COMPLETED and CANCELLED allow nothing")
    void terminalStatesAllowNothing() {
        assertTrue(COMPLETED.isTerminal());
        assertTrue(CANCELLED.isTerminal());
        assertTrue(COMPLETED.allowedNext().isEmpty());
        assertTrue(CANCELLED.allowedNext().isEmpty());

        for (RideStatus next : RideStatus.values()) {
            assertFalse(COMPLETED.canTransitionTo(next), "COMPLETED must not reach " + next);
            assertFalse(CANCELLED.canTransitionTo(next), "CANCELLED must not reach " + next);
        }
    }

    @Test
    @DisplayName("Cancellation is legal from every live state and from no terminal one")
    void cancellationIsLegalWhileLive() {
        assertTrue(REQUESTED.canTransitionTo(CANCELLED));
        assertTrue(ACCEPTED.canTransitionTo(CANCELLED));
        assertTrue(ONGOING.canTransitionTo(CANCELLED));
        assertTrue(DESTINATION_REACHED.canTransitionTo(CANCELLED));

        // Once payment is in flight the money, not the rider, decides the outcome.
        assertFalse(PAYMENT_PENDING.canTransitionTo(CANCELLED));
        assertFalse(COMPLETED.canTransitionTo(CANCELLED));
        assertFalse(CANCELLED.canTransitionTo(CANCELLED));
    }

    @Test
    @DisplayName("A failed payment is retryable — the trip already happened")
    void failedPaymentIsRetryable() {
        assertTrue(PAYMENT_PENDING.canTransitionTo(PAYMENT_FAILED));
        assertTrue(PAYMENT_FAILED.canTransitionTo(PAYMENT_PENDING));
        assertTrue(PAYMENT_FAILED.canTransitionTo(COMPLETED));
        assertFalse(PAYMENT_FAILED.isTerminal());
    }

    @Test
    @DisplayName("Skipping the trip: a ride cannot jump straight from REQUESTED to COMPLETED")
    void cannotSkipTheTrip() {
        assertFalse(REQUESTED.canTransitionTo(COMPLETED));
        assertFalse(REQUESTED.canTransitionTo(ONGOING));
        assertFalse(ACCEPTED.canTransitionTo(COMPLETED));
        assertFalse(ACCEPTED.canTransitionTo(DESTINATION_REACHED));
    }

    @Test
    @DisplayName("Rides never move backwards")
    void noBackwardTransitions() {
        assertFalse(ONGOING.canTransitionTo(ACCEPTED));
        assertFalse(ONGOING.canTransitionTo(REQUESTED));
        assertFalse(DESTINATION_REACHED.canTransitionTo(ONGOING));
        assertFalse(PAYMENT_PENDING.canTransitionTo(DESTINATION_REACHED));
    }

    @ParameterizedTest
    @EnumSource(RideStatus.class)
    @DisplayName("Every status declares a transition set and rejects a null target")
    void everyStatusIsDeclared(RideStatus status) {
        assertNotNull(status.allowedNext(), status + " has no declared transition set");
        assertFalse(status.canTransitionTo(null), status + " accepted a null target");
    }

    @ParameterizedTest
    @EnumSource(RideStatus.class)
    @DisplayName("No status may transition to itself")
    void noSelfTransitions(RideStatus status) {
        assertFalse(status.canTransitionTo(status), status + " allows a self-transition");
    }

    @Test
    @DisplayName("allowedNext() is unmodifiable — callers cannot widen the state machine")
    void allowedNextIsUnmodifiable() {
        assertThrows(UnsupportedOperationException.class, () -> REQUESTED.allowedNext().add(COMPLETED));
    }
}
