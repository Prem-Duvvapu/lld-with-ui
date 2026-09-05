package com.lld.notification;

import com.lld.notification.model.NotificationStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static com.lld.notification.model.NotificationStatus.*;
import static org.junit.jupiter.api.Assertions.*;

/** The declared transition table is the whole state machine — see the class javadoc on
 * {@link NotificationStatus} for why (mirrors {@code uber.model.RideStatus}). */
@DisplayName("Notification Status Transition Table")
class NotificationStatusTest {

    @Test
    @DisplayName("Happy path: PENDING -> SENT is legal")
    void happyPathSent() {
        assertTrue(PENDING.canTransitionTo(SENT));
    }

    @Test
    @DisplayName("PENDING may move to RETRYING, SUPPRESSED or FAILED as well as SENT")
    void pendingAllowsAllFourOutcomes() {
        assertTrue(PENDING.canTransitionTo(SENT));
        assertTrue(PENDING.canTransitionTo(RETRYING));
        assertTrue(PENDING.canTransitionTo(SUPPRESSED));
        assertTrue(PENDING.canTransitionTo(FAILED));
    }

    @Test
    @DisplayName("RETRYING may only resolve to SENT or FAILED — never back to PENDING")
    void retryingResolvesToSentOrFailedOnly() {
        assertTrue(RETRYING.canTransitionTo(SENT));
        assertTrue(RETRYING.canTransitionTo(FAILED));
        assertFalse(RETRYING.canTransitionTo(PENDING));
        assertFalse(RETRYING.canTransitionTo(SUPPRESSED));
    }

    @Test
    @DisplayName("Terminal states are dead ends: SENT, SUPPRESSED, FAILED allow nothing")
    void terminalStatesAllowNothing() {
        assertTrue(SENT.isTerminal());
        assertTrue(SUPPRESSED.isTerminal());
        assertTrue(FAILED.isTerminal());

        for (NotificationStatus next : NotificationStatus.values()) {
            assertFalse(SENT.canTransitionTo(next), "SENT must not reach " + next);
            assertFalse(SUPPRESSED.canTransitionTo(next), "SUPPRESSED must not reach " + next);
            assertFalse(FAILED.canTransitionTo(next), "FAILED must not reach " + next);
        }
    }

    @Test
    @DisplayName("PENDING is not terminal, and RETRYING is not terminal")
    void nonTerminalStates() {
        assertFalse(PENDING.isTerminal());
        assertFalse(RETRYING.isTerminal());
    }

    @ParameterizedTest
    @EnumSource(NotificationStatus.class)
    @DisplayName("Every status declares a transition set and rejects a null target")
    void everyStatusIsDeclared(NotificationStatus status) {
        assertNotNull(status.allowedNext(), status + " has no declared transition set");
        assertFalse(status.canTransitionTo(null), status + " accepted a null target");
    }

    @ParameterizedTest
    @EnumSource(NotificationStatus.class)
    @DisplayName("No status may transition to itself at the raw enum level")
    void noSelfTransitions(NotificationStatus status) {
        assertFalse(status.canTransitionTo(status), status + " allows a self-transition");
    }

    @Test
    @DisplayName("allowedNext() is unmodifiable — callers cannot widen the state machine")
    void allowedNextIsUnmodifiable() {
        assertThrows(UnsupportedOperationException.class, () -> PENDING.allowedNext().add(SENT));
    }
}
