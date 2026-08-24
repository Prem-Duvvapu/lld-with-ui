package com.lld.carrental.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Reservation lifecycle, with the legal transitions declared rather than implied
 * (same idiom as {@code uber.model.RideStatus}).
 *
 * <p>PENDING and CONFIRMED both still "hold" the vehicle for their date range — the overlap
 * check in {@code ReservationLockService} treats any non-terminal reservation as blocking, so a
 * reservation occupies its dates from the moment it is created, not only once payment clears.
 */
public enum ReservationStatus {
    PENDING,
    CONFIRMED,
    ACTIVE,
    COMPLETED,
    CANCELLED;

    private static final Map<ReservationStatus, Set<ReservationStatus>> ALLOWED = Map.of(
            PENDING, EnumSet.of(CONFIRMED, CANCELLED),
            CONFIRMED, EnumSet.of(ACTIVE, CANCELLED),
            ACTIVE, EnumSet.of(COMPLETED),
            COMPLETED, EnumSet.noneOf(ReservationStatus.class),
            CANCELLED, EnumSet.noneOf(ReservationStatus.class)
    );

    /** True when this reservation can never move again. */
    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    /** True when this reservation still occupies its date range on the vehicle's calendar. */
    public boolean blocksCalendar() {
        return this == PENDING || this == CONFIRMED || this == ACTIVE;
    }

    public boolean canTransitionTo(ReservationStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<ReservationStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}
