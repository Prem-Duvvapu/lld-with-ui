package com.lld.restaurant;

import com.lld.restaurant.model.OrderStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static com.lld.restaurant.model.OrderStatus.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * The transition table is the order's state machine. Each status pins exactly
 * which states follow it, and the guards prevent backward, self-, or skip
 * transitions.
 */
@DisplayName("Restaurant Order State Machine")
class OrderStatusTest {

    @Test
    @DisplayName("Happy path: PLACED → PREPARING → READY → SERVED → BILLED is legal")
    void happyPathIsLegal() {
        assertTrue(PLACED.canTransitionTo(PREPARING));
        assertTrue(PREPARING.canTransitionTo(READY));
        assertTrue(READY.canTransitionTo(SERVED));
        assertTrue(SERVED.canTransitionTo(BILLED));
    }

    @Test
    @DisplayName("Cancellation is legal from PLACED and PREPARING only")
    void cancellationFromLiveStates() {
        assertTrue(PLACED.canTransitionTo(CANCELLED));
        assertTrue(PREPARING.canTransitionTo(CANCELLED));
        assertFalse(READY.canTransitionTo(CANCELLED));
        assertFalse(SERVED.canTransitionTo(CANCELLED));
        assertFalse(BILLED.canTransitionTo(CANCELLED));
        assertFalse(CANCELLED.canTransitionTo(CANCELLED));
    }

    @Test
    @DisplayName("Terminal states BILLED and CANCELLED allow nothing")
    void terminalStatesAllowNothing() {
        assertTrue(BILLED.allowedNext().isEmpty());
        assertTrue(CANCELLED.allowedNext().isEmpty());

        for (OrderStatus next : OrderStatus.values()) {
            assertFalse(BILLED.canTransitionTo(next), "BILLED must not reach " + next);
            assertFalse(CANCELLED.canTransitionTo(next), "CANCELLED must not reach " + next);
        }
    }

    @Test
    @DisplayName("No backward transitions are allowed")
    void noBackwardTransitions() {
        assertFalse(PREPARING.canTransitionTo(PLACED));
        assertFalse(READY.canTransitionTo(PREPARING));
        assertFalse(READY.canTransitionTo(PLACED));
        assertFalse(SERVED.canTransitionTo(READY));
        assertFalse(SERVED.canTransitionTo(PREPARING));
        assertFalse(BILLED.canTransitionTo(SERVED));
    }

    @Test
    @DisplayName("Cannot skip steps in the pipeline")
    void cannotSkipSteps() {
        assertFalse(PLACED.canTransitionTo(READY));
        assertFalse(PLACED.canTransitionTo(SERVED));
        assertFalse(PLACED.canTransitionTo(BILLED));
        assertFalse(PREPARING.canTransitionTo(SERVED));
        assertFalse(PREPARING.canTransitionTo(BILLED));
        assertFalse(READY.canTransitionTo(BILLED));
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    @DisplayName("Every status declares a non-null transition set and rejects null")
    void everyStatusIsDeclared(OrderStatus status) {
        assertNotNull(status.allowedNext(), status + " has no declared transition set");
        assertFalse(status.canTransitionTo(null), status + " accepted a null target");
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    @DisplayName("No status may transition to itself")
    void noSelfTransitions(OrderStatus status) {
        assertFalse(status.canTransitionTo(status), status + " allows a self-transition");
    }

    @Test
    @DisplayName("allowedNext() is unmodifiable — callers cannot widen the state machine")
    void allowedNextIsUnmodifiable() {
        assertThrows(UnsupportedOperationException.class, () -> PLACED.allowedNext().add(BILLED));
    }

    @Test
    @DisplayName("PLACED allows exactly PREPARING and CANCELLED")
    void placedAllowedSet() {
        assertEquals(2, PLACED.allowedNext().size());
        assertTrue(PLACED.allowedNext().contains(PREPARING));
        assertTrue(PLACED.allowedNext().contains(CANCELLED));
    }

    @Test
    @DisplayName("PREPARING allows exactly READY and CANCELLED")
    void preparingAllowedSet() {
        assertEquals(2, PREPARING.allowedNext().size());
        assertTrue(PREPARING.allowedNext().contains(READY));
        assertTrue(PREPARING.allowedNext().contains(CANCELLED));
    }

    @Test
    @DisplayName("READY allows exactly SERVED")
    void readyAllowedSet() {
        assertEquals(1, READY.allowedNext().size());
        assertTrue(READY.allowedNext().contains(SERVED));
    }

    @Test
    @DisplayName("SERVED allows exactly BILLED")
    void servedAllowedSet() {
        assertEquals(1, SERVED.allowedNext().size());
        assertTrue(SERVED.allowedNext().contains(BILLED));
    }
}
