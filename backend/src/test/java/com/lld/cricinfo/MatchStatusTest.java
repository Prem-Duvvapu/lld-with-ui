package com.lld.cricinfo;

import com.lld.cricinfo.model.MatchStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("MatchStatus — legal transition table")
class MatchStatusTest {

    @Test
    void upcoming_canTransitionToLiveOrAbandoned() {
        assertTrue(MatchStatus.UPCOMING.canTransitionTo(MatchStatus.LIVE));
        assertTrue(MatchStatus.UPCOMING.canTransitionTo(MatchStatus.ABANDONED));
        assertFalse(MatchStatus.UPCOMING.canTransitionTo(MatchStatus.COMPLETED));
        assertFalse(MatchStatus.UPCOMING.canTransitionTo(MatchStatus.INNINGS_BREAK));
    }

    @Test
    void live_canTransitionToInningsBreakCompletedOrAbandoned() {
        assertTrue(MatchStatus.LIVE.canTransitionTo(MatchStatus.INNINGS_BREAK));
        assertTrue(MatchStatus.LIVE.canTransitionTo(MatchStatus.COMPLETED));
        assertTrue(MatchStatus.LIVE.canTransitionTo(MatchStatus.ABANDONED));
        assertFalse(MatchStatus.LIVE.canTransitionTo(MatchStatus.UPCOMING));
    }

    @Test
    void inningsBreak_canOnlyReturnToLiveOrAbandon() {
        assertTrue(MatchStatus.INNINGS_BREAK.canTransitionTo(MatchStatus.LIVE));
        assertTrue(MatchStatus.INNINGS_BREAK.canTransitionTo(MatchStatus.ABANDONED));
        assertFalse(MatchStatus.INNINGS_BREAK.canTransitionTo(MatchStatus.COMPLETED));
    }

    @Test
    void completedAndAbandoned_areTerminal() {
        assertTrue(MatchStatus.COMPLETED.isTerminal());
        assertTrue(MatchStatus.ABANDONED.isTerminal());
        assertTrue(MatchStatus.COMPLETED.allowedNext().isEmpty());
        assertFalse(MatchStatus.LIVE.isTerminal());
    }

    @Test
    void canTransitionTo_nullIsAlwaysFalse() {
        assertFalse(MatchStatus.LIVE.canTransitionTo(null));
    }
}
