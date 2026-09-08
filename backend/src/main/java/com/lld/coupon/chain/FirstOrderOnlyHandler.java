package com.lld.coupon.chain;

import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class FirstOrderOnlyHandler extends EligibilityHandler {
    @Override
    protected Optional<String> evaluate(Coupon coupon, CartContext cart) {
        if (coupon.isFirstOrderOnly() && !cart.isFirstOrder()) {
            return Optional.of("This coupon is only valid on a customer's first order");
        }
        return Optional.empty();
    }
}
