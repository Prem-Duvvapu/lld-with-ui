package com.lld.payment.model;

/** Which {@link com.lld.payment.strategy.PaymentMethodStrategy} a charge resolves to. */
public enum PaymentMethodType {
    CREDIT_CARD,
    UPI,
    WALLET
}
