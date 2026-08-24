package com.lld.concertticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a seat fails the availability re-check performed inside
 * {@code SeatLockManager}'s per-seat lock — either it is BOOKED, or it is HELD by a
 * different, still-live hold.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class SeatNotAvailableException extends ConcertTicketException {
    private final String seatId;

    public SeatNotAvailableException(String message) {
        super(message);
        this.seatId = null;
    }

    public SeatNotAvailableException(String message, String seatId) {
        super(message);
        this.seatId = seatId;
    }

    public String getSeatId() {
        return seatId;
    }
}
