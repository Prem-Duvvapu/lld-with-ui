package com.lld.shoppingcart.payment;

import com.lld.shoppingcart.model.PaymentMethod;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class DebitCardPaymentStrategy implements PaymentStrategy {
    @Override
    public String processPayment(String orderId, double amount) {
        return "TX-DC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Override
    public PaymentMethod getMethod() {
        return PaymentMethod.DEBIT_CARD;
    }
}
