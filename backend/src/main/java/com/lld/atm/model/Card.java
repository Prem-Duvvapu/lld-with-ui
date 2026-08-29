package com.lld.atm.model;

import lombok.Builder;
import lombok.Getter;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * A bank card: card number + PIN + the account it draws from, plus the 3-attempt PIN lockout
 * state ({@link #failedPinAttempts}, {@link #isBlocked}). {@code @Getter}-only, matching
 * {@link Account}'s precedent — the mutable {@code AtomicInteger} and {@code volatile boolean}
 * lockout fields must not end up in a generated {@code equals}/{@code hashCode}, which a blanket
 * {@code @Data} would produce.
 */
@Getter
@Builder
public class Card {
    private final String cardNumber;
    private final String pin;
    private final String accountNumber;
    @Builder.Default
    private final AtomicInteger failedPinAttempts = new AtomicInteger(0);
    @Builder.Default
    private volatile boolean isBlocked = false;

    public int getFailedPinAttempts() {
        return failedPinAttempts.get();
    }

    public int incrementFailedAttempts() {
        return failedPinAttempts.incrementAndGet();
    }

    public void resetFailedAttempts() {
        failedPinAttempts.set(0);
    }

    public boolean isBlocked() {
        return isBlocked;
    }

    public void blockCard() {
        this.isBlocked = true;
    }

    public void unblockCard() {
        this.isBlocked = false;
        resetFailedAttempts();
    }
}
