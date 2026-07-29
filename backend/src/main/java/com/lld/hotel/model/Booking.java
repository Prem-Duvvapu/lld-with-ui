package com.lld.hotel.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class Booking {
    public enum BookingStatus { CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED }

    private String id;
    private String hotelId;
    private String roomId;
    private String userId;
    private String guestName;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private BookingStatus status;
    private double totalAmount;
    private LocalDateTime createdAt;

    public Booking() {}

    public Booking(String id, String hotelId, String roomId, String userId,
                   String guestName, LocalDate checkIn, LocalDate checkOut,
                   BookingStatus status, double totalAmount) {
        this.id = id;
        this.hotelId = hotelId;
        this.roomId = roomId;
        this.userId = userId;
        this.guestName = guestName;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.status = status;
        this.totalAmount = totalAmount;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getHotelId() { return hotelId; }
    public void setHotelId(String hotelId) { this.hotelId = hotelId; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }
    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }
    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
