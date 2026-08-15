package com.lld.airline.strategy;

import com.lld.airline.model.Booking;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

@Component
public class TieredCancellationRefundPolicy implements RefundPolicy {

    @Override
    public double calculateRefund(Booking booking, LocalDateTime departureTime, LocalDateTime cancellationTime) {
        if (booking == null || departureTime == null) {
            return 0.0;
        }

        LocalDateTime cancelTime = cancellationTime != null ? cancellationTime : LocalDateTime.now();
        if (cancelTime.isAfter(departureTime)) {
            return 0.0; // Already departed
        }

        long hoursUntilDeparture = Duration.between(cancelTime, departureTime).toHours();
        double totalAmount = booking.getTotalAmount();

        if (hoursUntilDeparture >= 24) {
            return totalAmount; // 100% full refund
        } else if (hoursUntilDeparture >= 2) {
            return totalAmount * 0.50; // 50% partial refund
        } else {
            return 0.0; // 0% refund if inside 2 hours of departure
        }
    }
}
