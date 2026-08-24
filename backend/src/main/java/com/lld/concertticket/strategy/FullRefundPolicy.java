package com.lld.concertticket.strategy;

import com.lld.concertticket.model.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** Cancelling 7 or more days before the concert refunds the full amount paid. */
@Component
public class FullRefundPolicy implements CancellationPolicy {
    @Override
    public double calculateRefund(Booking booking, LocalDateTime eventDateTime, LocalDateTime cancelTime) {
        return booking.getTotalAmount();
    }

    @Override
    public String getPolicyName() {
        return "FULL_REFUND";
    }
}
