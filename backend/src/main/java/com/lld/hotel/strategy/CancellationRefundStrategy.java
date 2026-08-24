package com.lld.hotel.strategy;

import com.lld.hotel.model.Booking;

import java.time.LocalDate;

/**
 * Strategy for how much of a booking's total is returned on cancellation.
 *
 * <p>Refund rules used to not exist at all — {@code cancelBooking()} just flipped the status and
 * freed the room, with no notion of how much money the guest gets back. Real hotel cancellation
 * policies vary by notice given, so this is a strategy resolved by
 * {@link CancellationRefundStrategyFactory} rather than a single formula.
 */
public interface CancellationRefundStrategy {

    /** Identifier surfaced to the UI, the booking record and the simulation event log. */
    String getName();

    /**
     * @param booking          the reservation being cancelled (still holds its pre-cancellation status)
     * @param cancellationDate the date the cancellation is being processed
     */
    RefundResult calculateRefund(Booking booking, LocalDate cancellationDate);
}
