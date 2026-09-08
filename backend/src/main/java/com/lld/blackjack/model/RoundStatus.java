package com.lld.blackjack.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Round lifecycle, with the legal transitions declared rather than implied — the same
 * declared-transition-table idiom as {@code uber.model.RideStatus}. A natural blackjack on the
 * deal skips straight through {@code DEALER_TURN} to {@code SETTLEMENT} without any hit/stand
 * calls, which is why {@code PLAYER_TURN -> DEALER_TURN -> SETTLEMENT} is still walked
 * (never skipped) even in that shortcut — {@code BlackjackService} just does both transitions
 * back to back instead of waiting for player input.
 */
public enum RoundStatus {
    BETTING,
    DEALING,
    PLAYER_TURN,
    DEALER_TURN,
    SETTLEMENT;

    private static final Map<RoundStatus, Set<RoundStatus>> ALLOWED = Map.of(
            BETTING, EnumSet.of(DEALING),
            DEALING, EnumSet.of(PLAYER_TURN),
            PLAYER_TURN, EnumSet.of(DEALER_TURN),
            DEALER_TURN, EnumSet.of(SETTLEMENT),
            SETTLEMENT, EnumSet.noneOf(RoundStatus.class)
    );

    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public boolean canTransitionTo(RoundStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<RoundStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}
