package com.lld.payment.repository;

import com.lld.payment.exception.PaymentNotFoundException;
import com.lld.payment.model.Payment;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for live payment state — pure CRUD, the same shape as
 * {@code atm.repository.BankingRepository} / {@code locker.repository.LockerRepository}. No
 * fraud-chain, idempotency or locking logic lives here; that belongs to {@code PaymentService},
 * which owns a second, independently constructed instance of this class for its isolated
 * {@code /sim/*} sandbox.
 */
@Repository
public class PaymentRepository {

    private final Map<String, Payment> payments = new ConcurrentHashMap<>();

    public void save(Payment payment) {
        payments.put(payment.getId(), payment);
    }

    public Payment get(String paymentId) {
        Payment payment = payments.get(paymentId);
        if (payment == null) {
            throw new PaymentNotFoundException("Payment not found: " + paymentId);
        }
        return payment;
    }

    public List<Payment> getAll() {
        return new ArrayList<>(payments.values());
    }

    public List<Payment> getByPayer(String payerId) {
        return payments.values().stream().filter(p -> p.getPayerId().equals(payerId)).toList();
    }

    public void reset() {
        payments.clear();
    }
}
