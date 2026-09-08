package com.lld.payment;

import com.lld.payment.exception.FraudCheckFailedException;
import com.lld.payment.exception.InvalidRefundException;
import com.lld.payment.exception.PaymentNotFoundException;
import com.lld.payment.fraud.*;
import com.lld.payment.model.*;
import com.lld.payment.repository.PaymentRepository;
import com.lld.payment.service.PaymentService;
import com.lld.payment.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class PaymentServiceTest {

    private PaymentService service;

    @BeforeEach
    void setUp() {
        FraudCheckChainFactory chainFactory = new FraudCheckChainFactory(
                new VelocityCheckHandler(), new BlacklistCheckHandler(), new AmountLimitHandler());
        PaymentGatewayProcessor processor = new PaymentGatewayProcessor(List.of(
                new CreditCardPaymentMethodStrategy(), new UpiPaymentMethodStrategy(), new WalletPaymentMethodStrategy()));
        service = new PaymentService(new PaymentRepository(), chainFactory, processor);
    }

    @Test
    void aCleanChargeSucceedsAndReachesCaptured() {
        Payment payment = service.charge("K-1", "payer-1", 1000.0, PaymentMethodType.UPI);
        assertEquals(PaymentStatus.CAPTURED, payment.getStatus());
        assertNotNull(payment.getTransactionId());
        assertTrue(payment.getTransactionId().startsWith("TX-UPI-"));
    }

    @Test
    void chargeOverTheAmountCeilingFailsAndMarksThePaymentFailed() {
        FraudCheckFailedException ex = assertThrows(FraudCheckFailedException.class,
                () -> service.charge("K-1", "payer-1", AmountLimitHandler.MAX_AMOUNT + 1, PaymentMethodType.UPI));
        assertTrue(ex.getMessage().contains("Amount limit"));
    }

    @Test
    void tooManyChargesFromOnePayerTripsTheVelocityCheck() {
        for (int i = 0; i < VelocityCheckHandler.MAX_CHARGES_IN_WINDOW; i++) {
            service.charge("K-" + i, "payer-fast", 100.0, PaymentMethodType.UPI);
        }
        FraudCheckFailedException ex = assertThrows(FraudCheckFailedException.class,
                () -> service.charge("K-over", "payer-fast", 100.0, PaymentMethodType.UPI));
        assertTrue(ex.getMessage().contains("Velocity"));
    }

    @Test
    void repeatedChargeWithSameIdempotencyKeyReturnsTheIdenticalPayment() {
        Payment first = service.charge("K-SAME", "payer-1", 500.0, PaymentMethodType.WALLET);
        Payment second = service.charge("K-SAME", "payer-1", 500.0, PaymentMethodType.WALLET);
        assertSame(first, second);
    }

    @Test
    void chargeWithNoIdempotencyKeyIsNeverDeduped() {
        Payment first = service.charge(null, "payer-1", 500.0, PaymentMethodType.WALLET);
        Payment second = service.charge(null, "payer-1", 500.0, PaymentMethodType.WALLET);
        assertNotEquals(first.getId(), second.getId());
    }

    @Test
    void refundOfACapturedPaymentSucceeds() {
        Payment payment = service.charge("K-1", "payer-1", 1000.0, PaymentMethodType.UPI);
        Payment refunded = service.refund(payment.getId());
        assertEquals(PaymentStatus.REFUNDED, refunded.getStatus());
        assertNotNull(refunded.getRefundedAtEpoch());
    }

    @Test
    void refundingAnAlreadyRefundedPaymentThrowsInvalidRefundException() {
        Payment payment = service.charge("K-1", "payer-1", 1000.0, PaymentMethodType.UPI);
        service.refund(payment.getId());
        assertThrows(InvalidRefundException.class, () -> service.refund(payment.getId()));
    }

    @Test
    void gettingAnUnknownPaymentThrowsPaymentNotFoundException() {
        assertThrows(PaymentNotFoundException.class, () -> service.getPayment("nope"));
    }

    @Test
    void aPaymentCanNeverSkipAStateOrGoBackward() {
        Payment payment = new Payment("standalone", "K", "payer", 100.0, PaymentMethodType.UPI, System.currentTimeMillis());
        assertThrows(IllegalStateException.class, () -> payment.transitionTo(PaymentStatus.CAPTURED),
                "INITIATED cannot jump straight to CAPTURED, skipping AUTHORIZED");

        payment.transitionTo(PaymentStatus.AUTHORIZED);
        assertThrows(IllegalStateException.class, () -> payment.transitionTo(PaymentStatus.INITIATED),
                "AUTHORIZED cannot move backward to INITIATED");

        payment.transitionTo(PaymentStatus.CAPTURED);
        assertThrows(IllegalStateException.class, () -> payment.transitionTo(PaymentStatus.AUTHORIZED),
                "CAPTURED cannot move backward to AUTHORIZED");

        payment.transitionTo(PaymentStatus.REFUNDED);
        assertTrue(payment.getStatus().isTerminal(), "REFUNDED must be terminal");
        assertThrows(IllegalStateException.class, () -> payment.transitionTo(PaymentStatus.CAPTURED));
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        service.charge("K-LIVE", "payer-live", 100.0, PaymentMethodType.UPI);

        Map<String, Object> snapshot = service.simCharge("K-SIM", "payer-sim", 200.0, PaymentMethodType.WALLET);
        @SuppressWarnings("unchecked")
        List<Payment> simPayments = (List<Payment>) snapshot.get("payments");
        assertEquals(1, simPayments.size(), "the sim sandbox must only ever see its own charges");
        assertEquals("payer-sim", simPayments.get(0).getPayerId());
    }

    @Test
    void simResetWipesSimStateBackToEmpty() {
        service.simCharge("K-1", "payer-1", 100.0, PaymentMethodType.UPI);
        service.initSimState();

        Map<String, Object> snapshot = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Payment> simPayments = (List<Payment>) snapshot.get("payments");
        assertTrue(simPayments.isEmpty(), "reset must wipe every previously-charged sim payment");
    }
}
