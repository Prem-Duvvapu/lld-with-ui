package com.lld.atm.model;

import java.util.concurrent.atomic.AtomicInteger;

public class Card {
    private final String cardNumber;
    private final String pin;
    private final String accountNumber;
    private final AtomicInteger failedPinAttempts = new AtomicInteger(0);
    private volatile boolean isBlocked = false;

    public Card(String cardNumber, String pin, String accountNumber) {
        this.cardNumber = cardNumber;
        this.pin = pin;
        this.accountNumber = accountNumber;
    }

    public String getCardNumber() {
        return cardNumber;
    }

    public String getPin() {
        return pin;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

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
