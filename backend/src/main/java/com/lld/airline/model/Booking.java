package com.lld.airline.model;

import java.time.LocalDateTime;
import java.util.List;

public class Booking {
    public enum BookingStatus { CONFIRMED, CHECKED_IN, CANCELLED }

    private String id;
    private String flightId;
    private List<String> seatIds;
    private String userId;
    private String passengerName;
    private BookingStatus status;
    private double totalAmount;
    private LocalDateTime bookingTime;

    public Booking() {}

    public Booking(String id, String flightId, List<String> seatIds, String userId,
                   String passengerName, BookingStatus status, double totalAmount) {
        this.id = id;
        this.flightId = flightId;
        this.seatIds = seatIds;
        this.userId = userId;
        this.passengerName = passengerName;
        this.status = status;
        this.totalAmount = totalAmount;
        this.bookingTime = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFlightId() { return flightId; }
    public void setFlightId(String flightId) { this.flightId = flightId; }
    public List<String> getSeatIds() { return seatIds; }
    public void setSeatIds(List<String> seatIds) { this.seatIds = seatIds; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public LocalDateTime getBookingTime() { return bookingTime; }
    public void setBookingTime(LocalDateTime bookingTime) { this.bookingTime = bookingTime; }
}
