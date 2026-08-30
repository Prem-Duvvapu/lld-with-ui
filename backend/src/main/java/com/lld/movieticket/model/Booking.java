package com.lld.movieticket.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
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

    /** String mirror of {@link #bookingStatus} for callers/serializers that prefer a plain string. */
    public String getStatus() { return bookingStatus != null ? bookingStatus.name() : "PENDING"; }
    public void setStatus(String status) {
        try {
            this.bookingStatus = BookingStatus.valueOf(status.toUpperCase());
        } catch (Exception e) {
            this.bookingStatus = BookingStatus.PENDING;
        }
    }
}
