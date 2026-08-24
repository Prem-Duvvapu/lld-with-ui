package com.lld.concertticket.enums;

/**
 * AVAILABLE -&gt; HELD -&gt; BOOKED, with HELD able to fall back to AVAILABLE either because
 * the holder released it or because the TTL reaper found an expired hold. Enforced by
 * {@code SeatLockManager}, never mutated directly by the service.
 */
public enum SeatStatus {
    AVAILABLE,
    HELD,
    BOOKED
}
