package com.lld.airline.service;

import com.lld.airline.enums.PaymentStatus;
import com.lld.airline.exception.BookingFailedException;
import com.lld.airline.model.Payment;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component("airlinePaymentProcessor")
public class PaymentProcessor {

    private final Map<String, Payment> paymentIdempotencyCache = new ConcurrentHashMap<>();

    public Payment processPayment(String bookingId, double amount, String paymentMethod, String idempotencyKey) {
        if (idempotencyKey != null && paymentIdempotencyCache.containsKey(idempotencyKey)) {
            return paymentIdempotencyCache.get(idempotencyKey);
        }

        if (amount < 0) {
            throw new BookingFailedException("Invalid payment amount: " + amount);
        }

        String paymentId = "PAY-" + UUID.randomUUID().toString().substring(0, 8);
        Payment payment = Payment.builder()
                .paymentId(paymentId)
                .bookingId(bookingId)
                .amount(amount)
                .paymentMethod(paymentMethod != null ? paymentMethod : "CARD")
                .status(PaymentStatus.SUCCESS)
                .idempotencyKey(idempotencyKey)
                .build();

        if (idempotencyKey != null) {
            paymentIdempotencyCache.put(idempotencyKey, payment);
        }

        return payment;
    }

    public void clear() {
        paymentIdempotencyCache.clear();
    }
}
