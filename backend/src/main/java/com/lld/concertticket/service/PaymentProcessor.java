package com.lld.concertticket.service;

import com.lld.concertticket.enums.PaymentMethod;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Mock payment gateway — always succeeds unless {@link #setShouldFail} flips it on
 * (used by tests to exercise the "seats released back to AVAILABLE on payment failure"
 * path). Mirrors {@code movieticket.MovieTicketPaymentProcessor}.
 */
@Component
public class PaymentProcessor {
    private volatile boolean shouldFail = false;

    public void setShouldFail(boolean fail) {
        this.shouldFail = fail;
    }

    public String processPayment(String userId, double amount, PaymentMethod paymentMethod) {
        if (shouldFail) {
            throw new RuntimeException("Payment declined by issuing bank.");
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("Invalid payment amount: " + amount);
        }
        return "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
