package com.lld.concertticket.enums;

/**
 * Seating tier for a venue section. Price and layout are driven by this enum on
 * {@code Section} rather than a string literal, so a new tier is one enum constant
 * plus one seed entry — not a new branch in pricing/rendering logic.
 */
public enum SeatType {
    VIP,
    GOLD,
    SILVER,
    GENERAL
}
