package com.lld.shoppingcart.payment;

import com.lld.shoppingcart.model.PaymentMethod;

public interface PaymentStrategy {
    String processPayment(String orderId, double amount);
    PaymentMethod getMethod();
}
