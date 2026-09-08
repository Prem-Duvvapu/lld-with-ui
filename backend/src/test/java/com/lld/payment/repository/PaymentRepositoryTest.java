package com.lld.payment.repository;

import com.lld.payment.exception.PaymentNotFoundException;
import com.lld.payment.model.Payment;
import com.lld.payment.model.PaymentMethodType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class PaymentRepositoryTest {

    private PaymentRepository repository;

    @BeforeEach
    void setUp() {
        repository = new PaymentRepository();
    }

    @Test
    void unknownPaymentThrowsPaymentNotFoundException() {
        assertThrows(PaymentNotFoundException.class, () -> repository.get("nope"));
    }

    @Test
    void saveAndGetRoundTrips() {
        Payment payment = new Payment("PAY-1", "IDEMP-1", "payer-1", 100.0, PaymentMethodType.UPI, System.currentTimeMillis());
        repository.save(payment);
        assertEquals(payment, repository.get("PAY-1"));
    }

    @Test
    void getByPayerFiltersCorrectly() {
        repository.save(new Payment("PAY-1", "K1", "payer-A", 100.0, PaymentMethodType.UPI, System.currentTimeMillis()));
        repository.save(new Payment("PAY-2", "K2", "payer-A", 200.0, PaymentMethodType.UPI, System.currentTimeMillis()));
        repository.save(new Payment("PAY-3", "K3", "payer-B", 300.0, PaymentMethodType.UPI, System.currentTimeMillis()));

        assertEquals(2, repository.getByPayer("payer-A").size());
        assertEquals(1, repository.getByPayer("payer-B").size());
        assertEquals(0, repository.getByPayer("payer-C").size());
    }

    @Test
    void resetWipesEverything() {
        repository.save(new Payment("PAY-1", "K1", "payer-1", 100.0, PaymentMethodType.UPI, System.currentTimeMillis()));
        repository.reset();
        assertTrue(repository.getAll().isEmpty());
    }
}
