package com.lld.zomato;

import com.lld.zomato.model.OrderStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static com.lld.zomato.model.OrderStatus.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Zomato Order State Machine")
class OrderStatusTest {

    @Test
    @DisplayName("Happy path: PLACED -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED is legal")
    void happyPathIsLegal() {
        assertTrue(PLACED.canTransitionTo(CONFIRMED));
        assertTrue(CONFIRMED.canTransitionTo(PREPARING));
        assertTrue(PREPARING.canTransitionTo(READY_FOR_PICKUP));
        assertTrue(READY_FOR_PICKUP.canTransitionTo(OUT_FOR_DELIVERY));
        assertTrue(OUT_FOR_DELIVERY.canTransitionTo(DELIVERED));
    }

    @Test
    @DisplayName("Cancellation is legal up to and including READY_FOR_PICKUP, but not once OUT_FOR_DELIVERY")
    void cancellationRules() {
        assertTrue(PLACED.canTransitionTo(CANCELLED));
        assertTrue(CONFIRMED.canTransitionTo(CANCELLED));
        assertTrue(PREPARING.canTransitionTo(CANCELLED));
        assertTrue(READY_FOR_PICKUP.canTransitionTo(CANCELLED));

        assertFalse(OUT_FOR_DELIVERY.canTransitionTo(CANCELLED));
        assertFalse(DELIVERED.canTransitionTo(CANCELLED));
        assertFalse(CANCELLED.canTransitionTo(CANCELLED));
    }

    @Test
    @DisplayName("Terminal states DELIVERED and CANCELLED allow nothing")
    void terminalStatesAllowNothing() {
        assertTrue(DELIVERED.allowedNext().isEmpty());
        assertTrue(CANCELLED.allowedNext().isEmpty());
        assertTrue(DELIVERED.isTerminal());
        assertTrue(CANCELLED.isTerminal());

        for (OrderStatus next : OrderStatus.values()) {
            assertFalse(DELIVERED.canTransitionTo(next), "DELIVERED must not reach " + next);
            assertFalse(CANCELLED.canTransitionTo(next), "CANCELLED must not reach " + next);
        }
    }

    @Test
    @DisplayName("Non-terminal states return false for isTerminal()")
    void nonTerminalStates() {
        assertFalse(PLACED.isTerminal());
        assertFalse(CONFIRMED.isTerminal());
        assertFalse(PREPARING.isTerminal());
        assertFalse(READY_FOR_PICKUP.isTerminal());
        assertFalse(OUT_FOR_DELIVERY.isTerminal());
    }

    @Test
    @DisplayName("No backward transitions are allowed")
    void noBackwardTransitions() {
        assertFalse(CONFIRMED.canTransitionTo(PLACED));
        assertFalse(PREPARING.canTransitionTo(CONFIRMED));
        assertFalse(PREPARING.canTransitionTo(PLACED));
        assertFalse(READY_FOR_PICKUP.canTransitionTo(PREPARING));
        assertFalse(OUT_FOR_DELIVERY.canTransitionTo(READY_FOR_PICKUP));
        assertFalse(DELIVERED.canTransitionTo(OUT_FOR_DELIVERY));
    }

    @Test
    @DisplayName("Cannot skip steps in the pipeline")
    void cannotSkipSteps() {
        assertFalse(PLACED.canTransitionTo(PREPARING));
        assertFalse(PLACED.canTransitionTo(READY_FOR_PICKUP));
        assertFalse(PLACED.canTransitionTo(OUT_FOR_DELIVERY));
        assertFalse(PLACED.canTransitionTo(DELIVERED));
        assertFalse(CONFIRMED.canTransitionTo(READY_FOR_PICKUP));
        assertFalse(CONFIRMED.canTransitionTo(OUT_FOR_DELIVERY));
        assertFalse(PREPARING.canTransitionTo(OUT_FOR_DELIVERY));
        assertFalse(PREPARING.canTransitionTo(DELIVERED));
        assertFalse(READY_FOR_PICKUP.canTransitionTo(DELIVERED));
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
        assertThrows(UnsupportedOperationException.class, () -> PLACED.allowedNext().add(DELIVERED));
    }

    @Test
    @DisplayName("PLACED allows exactly CONFIRMED and CANCELLED")
    void placedAllowedSet() {
        assertEquals(2, PLACED.allowedNext().size());
        assertTrue(PLACED.allowedNext().contains(CONFIRMED));
        assertTrue(PLACED.allowedNext().contains(CANCELLED));
    }

    @Test
    @DisplayName("CONFIRMED allows exactly PREPARING and CANCELLED")
    void confirmedAllowedSet() {
        assertEquals(2, CONFIRMED.allowedNext().size());
        assertTrue(CONFIRMED.allowedNext().contains(PREPARING));
        assertTrue(CONFIRMED.allowedNext().contains(CANCELLED));
    }

    @Test
    @DisplayName("PREPARING allows exactly READY_FOR_PICKUP and CANCELLED")
    void preparingAllowedSet() {
        assertEquals(2, PREPARING.allowedNext().size());
        assertTrue(PREPARING.allowedNext().contains(READY_FOR_PICKUP));
        assertTrue(PREPARING.allowedNext().contains(CANCELLED));
    }

    @Test
    @DisplayName("READY_FOR_PICKUP allows exactly OUT_FOR_DELIVERY and CANCELLED")
    void readyForPickupAllowedSet() {
        assertEquals(2, READY_FOR_PICKUP.allowedNext().size());
        assertTrue(READY_FOR_PICKUP.allowedNext().contains(OUT_FOR_DELIVERY));
        assertTrue(READY_FOR_PICKUP.allowedNext().contains(CANCELLED));
    }

    @Test
    @DisplayName("OUT_FOR_DELIVERY allows exactly DELIVERED")
    void outForDeliveryAllowedSet() {
        assertEquals(1, OUT_FOR_DELIVERY.allowedNext().size());
        assertTrue(OUT_FOR_DELIVERY.allowedNext().contains(DELIVERED));
    }
}
