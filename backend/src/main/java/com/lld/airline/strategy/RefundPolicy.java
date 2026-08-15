package com.lld.airline.strategy;

import com.lld.airline.model.Booking;

import java.time.LocalDateTime;

public interface RefundPolicy {
    double calculateRefund(Booking booking, LocalDateTime departureTime, LocalDateTime cancellationTime);
}
