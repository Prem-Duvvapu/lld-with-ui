package com.lld.movieticket.model;

import java.time.LocalDateTime;
import java.util.List;

public class Booking {
    private long id;
    private long showId;
    private List<Long> seatIds;
    private String userId;
    private String status;
    private double totalAmount;
    private LocalDateTime bookingTime;

    public Booking() {}

    public Booking(long id, long showId, List<Long> seatIds, String userId, String status, double totalAmount, LocalDateTime bookingTime) {
        this.id = id;
        this.showId = showId;
        this.seatIds = seatIds;
        this.userId = userId;
        this.status = status;
        this.totalAmount = totalAmount;
        this.bookingTime = bookingTime;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public long getShowId() { return showId; }
    public void setShowId(long showId) { this.showId = showId; }

    public List<Long> getSeatIds() { return seatIds; }
    public void setSeatIds(List<Long> seatIds) { this.seatIds = seatIds; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getBookingTime() { return bookingTime; }
    public void setBookingTime(LocalDateTime bookingTime) { this.bookingTime = bookingTime; }
}
