package com.lld.concertticket.strategy;

import com.lld.concertticket.model.Booking;

import java.time.LocalDateTime;

/**
 * Strategy Pattern: refund calculation is delegated to whichever policy the concert's
 * days-until-event window resolves to, instead of an if/else ladder living in the
 * service. Mirrors {@code airline.RefundPolicy} / splitwise's split strategies.
 */
public interface CancellationPolicy {
    double calculateRefund(Booking booking, LocalDateTime eventDateTime, LocalDateTime cancelTime);

    String getPolicyName();
}
