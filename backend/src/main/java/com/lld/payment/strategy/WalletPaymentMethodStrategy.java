package com.lld.payment.strategy;

import com.lld.payment.model.PaymentMethodType;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class WalletPaymentMethodStrategy implements PaymentMethodStrategy {
    @Override
    public String process(String paymentId, double amount) {
        return "TX-WAL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Override
    public PaymentMethodType getMethod() {
        return PaymentMethodType.WALLET;
    }
}
