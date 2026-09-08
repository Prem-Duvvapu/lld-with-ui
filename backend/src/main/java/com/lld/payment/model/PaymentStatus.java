package com.lld.payment.model;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Payment lifecycle, with the legal transitions declared once — same idiom as
 * {@code uber.model.RideStatus} / this portfolio's {@code locker.model.LockerStatus}.
 *
 * <p>{@code charge()} drives a payment through {@code INITIATED -> AUTHORIZED -> CAPTURED} in
 * one call once the fraud chain approves it (a fraud rejection instead moves it
 * {@code INITIATED -> FAILED}), rather than exposing separate authorize/capture endpoints — the
 * two-hop model still gives the state machine real structure to enforce. {@code FAILED} and
 * {@code REFUNDED} are both terminal: a failed charge attempt is retried by submitting a new
 * charge (a new idempotency key), never by resurrecting the same {@link Payment}.
 */
public enum PaymentStatus {
    INITIATED,
    AUTHORIZED,
    CAPTURED,
    REFUNDED,
    FAILED;

    private static final Map<PaymentStatus, Set<PaymentStatus>> ALLOWED = Map.of(
            INITIATED, EnumSet.of(AUTHORIZED, FAILED),
            AUTHORIZED, EnumSet.of(CAPTURED, FAILED),
            CAPTURED, EnumSet.of(REFUNDED),
            REFUNDED, EnumSet.noneOf(PaymentStatus.class),
            FAILED, EnumSet.noneOf(PaymentStatus.class)
    );

    public boolean isTerminal() {
        return ALLOWED.get(this).isEmpty();
    }

    public boolean canTransitionTo(PaymentStatus next) {
        return next != null && ALLOWED.get(this).contains(next);
    }

    public Set<PaymentStatus> allowedNext() {
        return Collections.unmodifiableSet(ALLOWED.get(this));
    }
}
