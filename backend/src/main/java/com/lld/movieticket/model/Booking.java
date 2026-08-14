package com.lld.movieticket.model;

import java.time.LocalDateTime;
import java.util.List;

public class Booking {
    private long id;
    private long showId;
    private List<Long> seatIds;
    private String userId;
    private BookingStatus bookingStatus;
    private PaymentMethod paymentMethod;
    private double totalAmount;
    private LocalDateTime bookingTime;

    public Booking() {}

    public Booking(long id, long showId, List<Long> seatIds, String userId, BookingStatus bookingStatus, PaymentMethod paymentMethod, double totalAmount, LocalDateTime bookingTime) {
        this.id = id;
        this.showId = showId;
        this.seatIds = seatIds;
        this.userId = userId;
        this.bookingStatus = bookingStatus != null ? bookingStatus : BookingStatus.PENDING;
        this.paymentMethod = paymentMethod != null ? paymentMethod : PaymentMethod.UPI;
        this.totalAmount = totalAmount;
        this.bookingTime = bookingTime;
    }

    public Booking(long id, long showId, List<Long> seatIds, String userId, String status, double totalAmount, LocalDateTime bookingTime) {
        this.id = id;
        this.showId = showId;
        this.seatIds = seatIds;
        this.userId = userId;
        setStatus(status);
        this.paymentMethod = PaymentMethod.UPI;
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

    public BookingStatus getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(BookingStatus bookingStatus) { this.bookingStatus = bookingStatus; }

    public String getStatus() { return bookingStatus != null ? bookingStatus.name() : "PENDING"; }
    public void setStatus(String status) {
        try {
            this.bookingStatus = BookingStatus.valueOf(status.toUpperCase());
        } catch (Exception e) {
            this.bookingStatus = BookingStatus.PENDING;
        }
    }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getBookingTime() { return bookingTime; }
    public void setBookingTime(LocalDateTime bookingTime) { this.bookingTime = bookingTime; }
}
