package com.lld.shoppingcart.payment;

import com.lld.shoppingcart.model.PaymentMethod;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class WalletPaymentStrategy implements PaymentStrategy {
    @Override
    public String processPayment(String orderId, double amount) {
        return "TX-WAL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Override
    public PaymentMethod getMethod() {
        return PaymentMethod.WALLET;
    }
}
