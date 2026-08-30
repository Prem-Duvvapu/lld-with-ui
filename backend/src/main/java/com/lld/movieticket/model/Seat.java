package com.lld.movieticket.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Seat {
    private long id;
    private long showId;
    private int row;
    private int col;
    private SeatType seatType;
    private double price;
    private SeatStatus status;
    private String heldByUserId;
    private long holdExpiresAt;
    private long version;

    public Seat() {}

    public Seat(long id, long showId, int row, int col, SeatType seatType, double price, SeatStatus status) {
        this.id = id;
        this.showId = showId;
        this.row = row;
        this.col = col;
        this.seatType = seatType;
        this.price = price;
        this.status = status != null ? status : SeatStatus.AVAILABLE;
        this.heldByUserId = null;
        this.holdExpiresAt = 0L;
        this.version = 1L;
    }

    /** String mirror of {@link #seatType} for callers/serializers that prefer a plain string. */
    public String getType() { return seatType != null ? seatType.name() : "SILVER"; }
    public void setType(String type) {
        try {
            this.seatType = SeatType.valueOf(type.toUpperCase());
        } catch (Exception e) {
            this.seatType = SeatType.SILVER;
        }
    }

    public boolean isAvailable() { return status == SeatStatus.AVAILABLE; }
    public void setAvailable(boolean available) {
        this.status = available ? SeatStatus.AVAILABLE : SeatStatus.BOOKED;
    }
}
