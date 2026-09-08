package com.lld.coupon.strategy;

import com.lld.coupon.model.CartContext;
import org.springframework.stereotype.Component;

@Component
public class FlatOffStrategy implements DiscountStrategy {
    @Override
    public double apply(CartContext cart, double discountValue) {
        return Math.max(0, cart.getCartTotal() - discountValue);
    }
}
