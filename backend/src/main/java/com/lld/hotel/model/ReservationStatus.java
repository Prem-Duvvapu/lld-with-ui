package com.lld.hotel.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Reservation lifecycle, with the legal transitions declared rather than implied.
 *
 * <p>The previous model had four statuses (CONFIRMED/CHECKED_IN/CHECKED_OUT/CANCELLED) with
 * each service method deciding for itself which source states it would accept — e.g. cancel()
 * rejected CHECKED_OUT and CANCELLED by name but silently allowed cancelling a CHECKED_IN guest
 * out of a room they were standing in. The allowed set is now declared once here and enforced
 * in one place, the same pattern as {@code uber.model.RideStatus}.
 *
 * <p>PENDING exists so a booking can be constructed, priced and validated before it is
 * committed; {@code RoomBookingService.book()} moves a reservation from PENDING to CONFIRMED
 * inside the same locked section, so callers never observe a booking sitting in PENDING for a
 * live request — the state exists for the sim engine's staged walkthrough and for symmetry with
 * a real payment-authorization step.
 */
public enum ReservationStatus {
    PENDING,
    CONFIRMED,
    CHECKED_IN,
    CHECKED_OUT,
    CANCELLED,
    NO_SHOW;

    private static final Map<ReservationStatus, Set<ReservationStatus>> TRANSITIONS = Map.of(
            PENDING, EnumSet.of(CONFIRMED, CANCELLED),
            CONFIRMED, EnumSet.of(CHECKED_IN, CANCELLED, NO_SHOW),
            CHECKED_IN, EnumSet.of(CHECKED_OUT),
            CHECKED_OUT, EnumSet.noneOf(ReservationStatus.class),
            CANCELLED, EnumSet.noneOf(ReservationStatus.class),
            NO_SHOW, EnumSet.noneOf(ReservationStatus.class)
    );

    /** True when this reservation can never move again. */
    public boolean isTerminal() {
        return TRANSITIONS.get(this).isEmpty();
    }

    public boolean canTransitionTo(ReservationStatus next) {
        return next != null && TRANSITIONS.get(this).contains(next);
    }

    public Set<ReservationStatus> allowedNext() {
        return Collections.unmodifiableSet(TRANSITIONS.get(this));
    }

    /**
     * States in which the reservation still occupies the room's calendar for its date
     * range — the set {@code RoomBookingService} checks for overlap against when a new
     * booking is attempted. CHECKED_OUT/CANCELLED/NO_SHOW free the range back up.
     */
    public boolean holdsRoom() {
        return this == PENDING || this == CONFIRMED || this == CHECKED_IN;
    }
}
