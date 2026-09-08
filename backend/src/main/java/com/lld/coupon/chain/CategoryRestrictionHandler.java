package com.lld.coupon.chain;

import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CategoryRestrictionHandler extends EligibilityHandler {
    @Override
    protected Optional<String> evaluate(Coupon coupon, CartContext cart) {
        String requiredCategory = coupon.getRequiredCategory();
        if (requiredCategory != null && !requiredCategory.equalsIgnoreCase(cart.getCategory())) {
            return Optional.of(String.format(
                    "This coupon only applies to category '%s', cart is category '%s'", requiredCategory, cart.getCategory()));
        }
        return Optional.empty();
    }
}
