package com.lld.airline.strategy;

import com.lld.airline.model.Booking;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * The BASIC / "saver" fare family: no cash refund for a voluntary cancellation no matter how far
 * out it happens, mirroring real discount-fare terms. The only zero-refund case this and
 * {@link TieredCancellationRefundPolicy} share is cancelling after departure.
 */
@Component
public class NonRefundableFarePolicy implements RefundPolicy {

    @Override
    public double calculateRefund(Booking booking, LocalDateTime departureTime, LocalDateTime cancellationTime) {
        return 0.0;
    }
}
