package com.lld.hotel.strategy;

/** Outcome of a {@link CancellationRefundStrategy} — what comes back, and why. */
public record RefundResult(double amount, String reason) {
}
