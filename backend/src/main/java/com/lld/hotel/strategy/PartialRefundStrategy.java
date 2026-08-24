package com.lld.hotel.strategy;

import com.lld.hotel.model.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Cancelled late, but before arrival: half the total is forfeited. */
@Component
public class PartialRefundStrategy implements CancellationRefundStrategy {

    public static final double REFUND_FRACTION = 0.5;

    @Override
    public String getName() {
        return "PARTIAL_REFUND";
    }

    @Override
    public RefundResult calculateRefund(Booking booking, LocalDate cancellationDate) {
        double amount = StandardTariffRounding.round(booking.getTotalAmount() * REFUND_FRACTION);
        return new RefundResult(amount,
                "Cancelled within " + CancellationRefundStrategyFactory.FULL_REFUND_THRESHOLD_DAYS
                        + " days of check-in: 50% refund");
    }
}
