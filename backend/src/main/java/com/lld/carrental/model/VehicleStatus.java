package com.lld.carrental.model;

/**
 * Fleet-level lifecycle of a vehicle — deliberately <b>not</b> a per-date availability flag.
 *
 * <p>An earlier draft of this module's design (see {@code data/design/car-rental.js}) proposed a
 * {@code RESERVED} status alongside {@code AVAILABLE}/{@code RENTED}. That only makes sense if a
 * vehicle can be reserved once, ever — but this module's actual point is date-range reservations,
 * where the same vehicle legitimately carries many non-overlapping bookings. Flipping the vehicle
 * to a single "reserved" flag the moment one booking exists would incorrectly block every other
 * (non-overlapping) date range for it, defeating the feature. So:
 *
 * <ul>
 *   <li>{@link #AVAILABLE} / {@link #RENTED} are purely informational — RENTED just mirrors
 *       "there is an ACTIVE (picked-up) reservation for this vehicle right now" for the UI.</li>
 *   <li>{@link #MAINTENANCE} / {@link #RETIRED} are the only statuses that actually gate new
 *       reservations — they take the vehicle out of the fleet entirely.</li>
 *   <li>Whether a vehicle is free for a given date range is answered by checking the overlap of
 *       its existing reservations ({@code ReservationLockService}), never by this field.</li>
 * </ul>
 */
public enum VehicleStatus {
    AVAILABLE,
    RENTED,
    MAINTENANCE,
    RETIRED
}
