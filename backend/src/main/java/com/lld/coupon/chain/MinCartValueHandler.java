package com.lld.coupon.chain;

import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class MinCartValueHandler extends EligibilityHandler {
    @Override
    protected Optional<String> evaluate(Coupon coupon, CartContext cart) {
        if (cart.getCartTotal() < coupon.getMinCartValue()) {
            return Optional.of(String.format(
                    "Cart total %.2f is below the minimum %.2f required for this coupon", cart.getCartTotal(), coupon.getMinCartValue()));
        }
        return Optional.empty();
    }
}
