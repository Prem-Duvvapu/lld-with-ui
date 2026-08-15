package com.lld.airline.model;

import com.lld.airline.enums.BookingStatus;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

public class Booking {
    private final String bookingId;
    private final String flightId;
    private final String userId;
    private final List<Passenger> passengers;
    private final List<String> seatNumbers;
    private final double totalAmount;
    private volatile double refundAmount;
    private volatile BookingStatus status;
    private final Instant createdAt;
    private volatile Instant cancelledAt;

    public Booking(String bookingId, String flightId, String userId, List<Passenger> passengers,
                   List<String> seatNumbers, double totalAmount) {
        this.bookingId = bookingId;
        this.flightId = flightId;
        this.userId = userId;
        this.passengers = passengers != null ? List.copyOf(passengers) : List.of();
        this.seatNumbers = seatNumbers != null ? List.copyOf(seatNumbers) : List.of();
        this.totalAmount = totalAmount;
        this.refundAmount = 0.0;
        this.status = BookingStatus.PENDING;
        this.createdAt = Instant.now();
        this.cancelledAt = null;
    }

    public String getBookingId() {
        return bookingId;
    }

    public String getFlightId() {
        return flightId;
    }

    public String getUserId() {
        return userId;
    }

    public List<Passenger> getPassengers() {
        return Collections.unmodifiableList(passengers);
    }

    public List<String> getSeatNumbers() {
        return Collections.unmodifiableList(seatNumbers);
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public double getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(double refundAmount) {
        this.refundAmount = refundAmount;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public void setStatus(BookingStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(Instant cancelledAt) {
        this.cancelledAt = cancelledAt;
    }
}
