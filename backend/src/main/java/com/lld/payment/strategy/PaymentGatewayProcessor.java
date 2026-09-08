package com.lld.payment.strategy;

import com.lld.payment.model.PaymentMethodType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves {@link PaymentMethodType} to its strategy via a map built once — the same shape as
 * {@code shoppingcart.payment.ShoppingCartPaymentProcessor}. Every enum constant has a matching
 * {@code @Component} strategy discovered by Spring, so the lookup is trusted rather than
 * defensively null-checked, the same way {@code ShoppingCartPaymentProcessor} only guards this
 * for a deliberately partial test double, not production wiring.
 */
@Component
public class PaymentGatewayProcessor {

    private final Map<PaymentMethodType, PaymentMethodStrategy> strategies = new HashMap<>();

    public PaymentGatewayProcessor(List<PaymentMethodStrategy> strategyList) {
        for (PaymentMethodStrategy s : strategyList) {
            strategies.put(s.getMethod(), s);
        }
    }

    public String process(String paymentId, double amount, PaymentMethodType method) {
        return strategies.get(method).process(paymentId, amount);
    }
}
