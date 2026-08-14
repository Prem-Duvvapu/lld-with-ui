package com.lld.movieticket.exception;

public class SeatNotAvailableException extends MovieTicketException {
    private final Long seatId;

    public SeatNotAvailableException(String message, Long seatId) {
        super("SEAT_UNAVAILABLE", message);
        this.seatId = seatId;
    }

    public SeatNotAvailableException(String message) {
        this(message, null);
    }

    public Long getSeatId() {
        return seatId;
    }
}
