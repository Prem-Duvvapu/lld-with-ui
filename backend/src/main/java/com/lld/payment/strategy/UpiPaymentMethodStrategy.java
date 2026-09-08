package com.lld.payment.strategy;

import com.lld.payment.model.PaymentMethodType;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UpiPaymentMethodStrategy implements PaymentMethodStrategy {
    @Override
    public String process(String paymentId, double amount) {
        return "TX-UPI-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Override
    public PaymentMethodType getMethod() {
        return PaymentMethodType.UPI;
    }
}
