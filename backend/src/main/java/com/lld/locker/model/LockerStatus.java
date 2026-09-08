package com.lld.locker.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * A locker's physical lifecycle, declared once and enforced in one place — same idiom as
 * {@code uber.model.RideStatus}. Unlike a ride, a locker's cycle has no terminal state: it is
 * meant to be reused forever.
 *
 * <p>{@code deposit()} drives a locker through two hops in one call
 * ({@code EMPTY -> OCCUPIED} the instant the courier physically closes the door, then
 * {@code OCCUPIED -> AWAITING_PICKUP} once the system has generated and recorded the pickup
 * code) rather than exposing a separate "confirm deposit" endpoint — the two-step model still
 * gives the state machine genuine structure to enforce and demonstrate.
 */
public enum LockerStatus {
    EMPTY,
    OCCUPIED,
    AWAITING_PICKUP;

    private static final Map<LockerStatus, Set<LockerStatus>> ALLOWED = Map.of(
            EMPTY, EnumSet.of(OCCUPIED),
            OCCUPIED, EnumSet.of(AWAITING_PICKUP),
            AWAITING_PICKUP, EnumSet.of(EMPTY)
    );

    public boolean canTransitionTo(LockerStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<LockerStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}
