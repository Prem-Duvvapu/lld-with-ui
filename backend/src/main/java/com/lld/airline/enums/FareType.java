package com.lld.airline.enums;

/**
 * The fare family a passenger books under. Resolved to a {@link com.lld.airline.strategy.RefundPolicy}
 * by {@code RefundPolicyFactory} — adding a fare family is one enum constant, one policy, one put.
 */
public enum FareType {
    /** Standard fare: tiered cancellation refund (100% &gt;=24h, 50% 24h-2h, 0% &lt;2h out). */
    FLEXIBLE,
    /** Discount "saver" fare: non-refundable once booked, regardless of how far out the cancellation is. */
    BASIC
}
