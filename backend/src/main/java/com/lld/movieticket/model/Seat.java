package com.lld.movieticket.model;

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

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public long getShowId() { return showId; }
    public void setShowId(long showId) { this.showId = showId; }

    public int getRow() { return row; }
    public void setRow(int row) { this.row = row; }

    public int getCol() { return col; }
    public void setCol(int col) { this.col = col; }

    public SeatType getSeatType() { return seatType; }
    public void setSeatType(SeatType seatType) { this.seatType = seatType; }

    public String getType() { return seatType != null ? seatType.name() : "SILVER"; }
    public void setType(String type) {
        try {
            this.seatType = SeatType.valueOf(type.toUpperCase());
        } catch (Exception e) {
            this.seatType = SeatType.SILVER;
        }
    }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public SeatStatus getStatus() { return status; }
    public void setStatus(SeatStatus status) { this.status = status; }

    public boolean isAvailable() { return status == SeatStatus.AVAILABLE; }
    public void setAvailable(boolean available) {
        this.status = available ? SeatStatus.AVAILABLE : SeatStatus.BOOKED;
    }

    public String getHeldByUserId() { return heldByUserId; }
    public void setHeldByUserId(String heldByUserId) { this.heldByUserId = heldByUserId; }

    public long getHoldExpiresAt() { return holdExpiresAt; }
    public void setHoldExpiresAt(long holdExpiresAt) { this.holdExpiresAt = holdExpiresAt; }

    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
}
