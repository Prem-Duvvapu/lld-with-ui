package com.lld.hotel.strategy;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.ReservationStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Resolves the refund strategy for a cancellation from how much notice was given. */
@Component
public class CancellationRefundStrategyFactory {

    /** Cancelling this many days or more before check-in earns a full refund. */
    public static final int FULL_REFUND_THRESHOLD_DAYS = 3;

    private final FullRefundStrategy full;
    private final PartialRefundStrategy partial;
    private final NoRefundStrategy none;

    public CancellationRefundStrategyFactory(FullRefundStrategy full, PartialRefundStrategy partial,
                                              NoRefundStrategy none) {
        this.full = full;
        this.partial = partial;
        this.none = none;
    }

    public CancellationRefundStrategy resolve(Booking booking, LocalDate cancellationDate) {
        if (booking.getStatus() == ReservationStatus.NO_SHOW) {
            return none;
        }
        if (!cancellationDate.isBefore(booking.getCheckIn())) {
            // Cancelling on or after the check-in date — the room was held for them.
            return none;
        }
        long daysUntilCheckIn = ChronoUnit.DAYS.between(cancellationDate, booking.getCheckIn());
        return daysUntilCheckIn >= FULL_REFUND_THRESHOLD_DAYS ? full : partial;
    }

    public FullRefundStrategy full() {
        return full;
    }

    public PartialRefundStrategy partial() {
        return partial;
    }

    public NoRefundStrategy none() {
        return none;
    }
}
