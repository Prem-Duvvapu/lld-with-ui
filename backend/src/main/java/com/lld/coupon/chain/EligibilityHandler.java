package com.lld.coupon.chain;

import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;

import java.util.Optional;

/**
 * Chain of Responsibility, same {@code setNext}-linking shape as {@code logging.chain.LogHandler}
 * and {@code payment.fraud.FraudCheckHandler}. Each concrete handler decides independently
 * whether to reject; the base class owns delegating to the next handler when this one passes.
 */
public abstract class EligibilityHandler {

    private EligibilityHandler next;

    public EligibilityHandler setNext(EligibilityHandler next) {
        this.next = next;
        return next;
    }

    /** Template method: evaluate(), then delegate to the next handler if this one passed. */
    public final Optional<String> check(Coupon coupon, CartContext cart) {
        Optional<String> rejection = evaluate(coupon, cart);
        if (rejection.isPresent()) {
            return rejection;
        }
        return next != null ? next.check(coupon, cart) : Optional.empty();
    }

    /** Empty means pass; present is the rejection reason. */
    protected abstract Optional<String> evaluate(Coupon coupon, CartContext cart);
}
