package com.lld.concertticket.strategy;

import com.lld.concertticket.model.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** Cancelling inside 2 days of the concert (or after it has started) forfeits the fare. */
@Component
public class NoRefundPolicy implements CancellationPolicy {
    @Override
    public double calculateRefund(Booking booking, LocalDateTime eventDateTime, LocalDateTime cancelTime) {
        return 0.0;
    }

    @Override
    public String getPolicyName() {
        return "NO_REFUND";
    }
}
