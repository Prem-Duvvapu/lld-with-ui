package com.lld.hotel.strategy;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.ReservationStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** No-show, or cancelled on/after the check-in date: nothing is returned. */
@Component
public class NoRefundStrategy implements CancellationRefundStrategy {

    @Override
    public String getName() {
        return "NO_REFUND";
    }

    @Override
    public RefundResult calculateRefund(Booking booking, LocalDate cancellationDate) {
        String reason = booking.getStatus() == ReservationStatus.NO_SHOW
                ? "No-show forfeits the full amount"
                : "Cancelled on or after check-in: no refund";
        return new RefundResult(0.0, reason);
    }
}
