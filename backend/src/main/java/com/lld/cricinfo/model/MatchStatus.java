package com.lld.cricinfo.model;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * State machine for a match's lifecycle. Legal transitions live in one table
 * (see uber's RideStatus / zomato's OrderStatus) instead of scattered guard
 * clauses, so a new state doesn't require re-auditing every mutator.
 */
public enum MatchStatus {
    UPCOMING,
    LIVE,
    INNINGS_BREAK,
    COMPLETED,
    ABANDONED;

    private static final Map<MatchStatus, Set<MatchStatus>> TRANSITIONS = new EnumMap<>(MatchStatus.class);

    static {
        TRANSITIONS.put(UPCOMING, Collections.unmodifiableSet(EnumSet.of(LIVE, ABANDONED)));
        TRANSITIONS.put(LIVE, Collections.unmodifiableSet(EnumSet.of(INNINGS_BREAK, COMPLETED, ABANDONED)));
        TRANSITIONS.put(INNINGS_BREAK, Collections.unmodifiableSet(EnumSet.of(LIVE, ABANDONED)));
        TRANSITIONS.put(COMPLETED, Collections.unmodifiableSet(EnumSet.noneOf(MatchStatus.class)));
        TRANSITIONS.put(ABANDONED, Collections.unmodifiableSet(EnumSet.noneOf(MatchStatus.class)));
    }

    public Set<MatchStatus> allowedNext() {
        return TRANSITIONS.getOrDefault(this, Collections.emptySet());
    }

    public boolean canTransitionTo(MatchStatus to) {
        return to != null && allowedNext().contains(to);
    }

    public boolean isTerminal() {
        return allowedNext().isEmpty();
    }
}
