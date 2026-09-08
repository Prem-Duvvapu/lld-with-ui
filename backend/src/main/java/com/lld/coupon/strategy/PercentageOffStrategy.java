package com.lld.coupon.strategy;

import com.lld.coupon.model.CartContext;
import org.springframework.stereotype.Component;

@Component
public class PercentageOffStrategy implements DiscountStrategy {
    @Override
    public double apply(CartContext cart, double discountValue) {
        double fraction = Math.max(0, Math.min(100, discountValue)) / 100.0;
        return Math.max(0, cart.getCartTotal() * (1 - fraction));
    }
}
