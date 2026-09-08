package com.lld.payment.strategy;

import com.lld.payment.model.PaymentMethodType;

public interface PaymentMethodStrategy {
    String process(String paymentId, double amount);
    PaymentMethodType getMethod();
}
