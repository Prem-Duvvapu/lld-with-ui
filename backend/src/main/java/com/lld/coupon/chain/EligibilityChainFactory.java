package com.lld.coupon.chain;

import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import org.springframework.stereotype.Component;

/**
 * Wires the fixed handler order (min cart value -> category -> first-order-only) and runs it —
 * the same shape as {@code payment.fraud.FraudCheckChainFactory}.
 */
@Component
public class EligibilityChainFactory {

    private final EligibilityHandler chainHead;

    public EligibilityChainFactory(MinCartValueHandler minCartValue, CategoryRestrictionHandler category,
                                    FirstOrderOnlyHandler firstOrderOnly) {
        minCartValue.setNext(category).setNext(firstOrderOnly);
        this.chainHead = minCartValue;
    }

    public EligibilityResult run(Coupon coupon, CartContext cart) {
        return chainHead.check(coupon, cart)
                .map(EligibilityResult::rejected)
                .orElseGet(EligibilityResult::eligible);
    }
}
