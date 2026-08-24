package com.lld.hotel.strategy;

import com.lld.hotel.model.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Cancelled with enough notice: the guest gets everything back. */
@Component
public class FullRefundStrategy implements CancellationRefundStrategy {

    @Override
    public String getName() {
        return "FULL_REFUND";
    }

    @Override
    public RefundResult calculateRefund(Booking booking, LocalDate cancellationDate) {
        return new RefundResult(booking.getTotalAmount(),
                "Cancelled " + CancellationRefundStrategyFactory.FULL_REFUND_THRESHOLD_DAYS
                        + "+ days before check-in: full refund");
    }
}
