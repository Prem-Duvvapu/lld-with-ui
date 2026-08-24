package com.lld.concertticket.enums;

/**
 * PENDING -&gt; CONFIRMED -&gt; (CANCELLED | REFUNDED). A booking is created PENDING the
 * moment seats are held (design doc: "selectSeats creates a PENDING booking"), becomes
 * CONFIRMED once payment clears, and moves to CANCELLED/REFUNDED on cancellation or on
 * hold-TTL expiry. PENDING and CONFIRMED are the only pre-terminal states.
 */
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    CANCELLED,
    REFUNDED
}
