package com.lld.concertticket.model;

import com.lld.concertticket.enums.BookingStatus;
import com.lld.concertticket.enums.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A booking exists from the moment seats are held — PENDING, with {@code holdExpiresAt}
 * set — through payment confirmation (CONFIRMED) to eventual CANCELLED/REFUNDED. This
 * differs from movieticket, where a booking record isn't created until payment succeeds;
 * concert-ticket's design doc explicitly calls for a visible PENDING booking during the
 * hold window, so the hold-expiry sweep has a booking record to cancel, not just seats
 * to release.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {
    private long id;
    private String userId;
    private long eventId;
    private List<String> seatIds;
    private double totalAmount;
    private BookingStatus status;
    private long holdExpiresAt;
    private PaymentMethod paymentMethod;
    private String paymentRef;
    private double refundAmount;
    private LocalDateTime bookingTime;
    private LocalDateTime cancelledAt;
}
