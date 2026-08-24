package com.lld.concertticket.strategy;

import com.lld.concertticket.model.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** Cancelling 2-6 days before the concert refunds half the amount paid. */
@Component
public class PartialRefundPolicy implements CancellationPolicy {
    private static final double REFUND_RATE = 0.5;

    @Override
    public double calculateRefund(Booking booking, LocalDateTime eventDateTime, LocalDateTime cancelTime) {
        return booking.getTotalAmount() * REFUND_RATE;
    }

    @Override
    public String getPolicyName() {
        return "PARTIAL_REFUND_50";
    }
}
