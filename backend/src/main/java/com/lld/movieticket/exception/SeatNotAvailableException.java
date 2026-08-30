package com.lld.movieticket.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A requested seat is HELD by someone else or already BOOKED. */
@ResponseStatus(HttpStatus.CONFLICT)
public class SeatNotAvailableException extends MovieTicketException {
    private final Long seatId;

    public SeatNotAvailableException(String message, Long seatId) {
        super(message);
        this.seatId = seatId;
    }

    public SeatNotAvailableException(String message) {
        this(message, null);
    }

    public Long getSeatId() {
        return seatId;
    }
}
