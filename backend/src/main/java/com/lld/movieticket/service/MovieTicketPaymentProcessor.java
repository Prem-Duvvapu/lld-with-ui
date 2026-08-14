package com.lld.movieticket.service;

import com.lld.movieticket.model.PaymentMethod;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("movieTicketPaymentProcessor")
public class MovieTicketPaymentProcessor {
    private boolean shouldFail = false;

    public void setShouldFail(boolean fail) {
        this.shouldFail = fail;
    }

    public String processPayment(String userId, double amount, PaymentMethod paymentMethod) {
        if (shouldFail) {
            throw new RuntimeException("Payment processing failed due to bank network timeout.");
        }
        if (amount <= 0) {
            throw new IllegalArgumentException("Invalid payment amount: ₹" + amount);
        }
        return "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
