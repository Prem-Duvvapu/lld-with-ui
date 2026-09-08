package com.lld.payment.service;

import com.lld.payment.model.PaymentMethodType;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds a couple of demo charges (one refunded) so the UI shows something meaningful on first load. */
@Component
public class PaymentInitializer implements CommandLineRunner {

    private final PaymentService paymentService;

    public PaymentInitializer(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Override
    public void run(String... args) {
        paymentService.charge("SEED-1", "payer-alice", 2499.0, PaymentMethodType.CREDIT_CARD);
        var refundable = paymentService.charge("SEED-2", "payer-bob", 899.0, PaymentMethodType.UPI);
        paymentService.refund(refundable.getId());
        paymentService.charge("SEED-3", "payer-carol", 15999.0, PaymentMethodType.WALLET);
    }
}
