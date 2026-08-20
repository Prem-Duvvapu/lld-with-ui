package com.lld.uber.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;																			
import java.util.Set;

/**
 * Ride lifecycle, with the legal transitions declared rather than implied.
 *
 * <p>Previously each service method re-derived its own notion of "which statuses may I move
 * from", using a different list each time — completeTrip() accepted five source states,
 * startTrip() two, and nothing rejected a move out of a terminal state. The allowed set is
 * now declared once here and enforced in one place.
 */
public enum RideStatus {
    REQUESTED,
    ACCEPTED,
    ONGOING,
    DESTINATION_REACHED,
    PAYMENT_PENDING,
    PAYMENT_FAILED,
    COMPLETED,
    CANCELLED;

    private static final Map<RideStatus, Set<RideStatus>> ALLOWED = Map.of(
            REQUESTED, EnumSet.of(ACCEPTED, CANCELLED),
            ACCEPTED, EnumSet.of(ONGOING, CANCELLED),
            ONGOING, EnumSet.of(DESTINATION_REACHED, CANCELLED),
            DESTINATION_REACHED, EnumSet.of(PAYMENT_PENDING, CANCELLED),
            PAYMENT_PENDING, EnumSet.of(COMPLETED, PAYMENT_FAILED),
            // A failed payment is retryable; the trip already happened.
            PAYMENT_FAILED, EnumSet.of(PAYMENT_PENDING, COMPLETED),
            COMPLETED, EnumSet.noneOf(RideStatus.class),
            CANCELLED, EnumSet.noneOf(RideStatus.class)
    );

    /** True when this ride can never move again. */
    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public boolean canTransitionTo(RideStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<RideStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}
