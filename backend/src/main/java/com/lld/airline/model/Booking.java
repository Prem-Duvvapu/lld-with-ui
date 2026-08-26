package com.lld.airline.model;

import com.lld.airline.enums.BookingStatus;
import com.lld.airline.enums.FareType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    private String bookingId;
    private String flightId;
    private String userId;
    private List<Passenger> passengers;
    private List<String> seatNumbers;
    private double totalAmount;
    @Builder.Default
    private double refundAmount = 0.0;
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;
    /** Which {@link com.lld.airline.strategy.RefundPolicy} governs a cancellation of this booking. */
    @Builder.Default
    private FareType fareType = FareType.FLEXIBLE;
    @Builder.Default
    private Instant createdAt = Instant.now();
    private Instant cancelledAt;
}
