package com.lld.hotel.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    private String id;
    private String hotelId;
    private String roomId;
    private String userId;
    private String guestName;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private ReservationStatus status;
    private double totalAmount;
    /** Name of the {@code TariffStrategy} that priced this stay — surfaced to the UI. */
    private String tariffStrategyName;
    private double refundAmount;
    private String refundReason;
    private LocalDateTime createdAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private LocalDateTime cancelledAt;

    /** Half-open interval overlap: [checkIn, checkOut) intersects [otherCheckIn, otherCheckOut). */
    public boolean overlaps(LocalDate otherCheckIn, LocalDate otherCheckOut) {
        return checkIn.isBefore(otherCheckOut) && otherCheckIn.isBefore(checkOut);
    }
}
