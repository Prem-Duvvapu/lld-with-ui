package com.lld.shoppingcart.payment;

import com.lld.shoppingcart.exception.PaymentFailedException;
import com.lld.shoppingcart.model.PaymentMethod;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component("shoppingCartPaymentProcessor")
public class ShoppingCartPaymentProcessor {

    private final Map<PaymentMethod, PaymentStrategy> strategies = new HashMap<>();

    public ShoppingCartPaymentProcessor(List<PaymentStrategy> strategyList) {
        for (PaymentStrategy s : strategyList) {
            strategies.put(s.getMethod(), s);
        }
    }

    public String executePayment(String orderId, double amount, PaymentMethod method) {
        PaymentStrategy strategy = strategies.get(method);
        if (strategy == null) {
            throw new PaymentFailedException("Unsupported payment method: " + method);
        }
        return strategy.processPayment(orderId, amount);
    }
}
