package com.lld.hotel.model;

/**
 * Whether a room is in service at all. Deliberately does NOT include a "booked"
 * or "occupied" state — a room accepts many non-overlapping reservations over
 * time, so "is this room free" is always a question about a specific date range,
 * answered by checking {@link ReservationStatus#holdsRoom()} bookings for that
 * room (see {@code RoomBookingService}), never by a single room-wide flag.
 */
public enum RoomStatus {
    AVAILABLE,
    MAINTENANCE
}
