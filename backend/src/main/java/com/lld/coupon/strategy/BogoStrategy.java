package com.lld.coupon.strategy;

import com.lld.coupon.model.CartContext;
import org.springframework.stereotype.Component;

/**
 * Buy-one-get-one: every 2nd item in the cart is free. Unlike the other two strategies, this one
 * genuinely depends on {@code itemCount}, not just {@code discountValue} — with fewer than 2
 * items there is nothing to pair up, so no discount applies at all.
 */
@Component
public class BogoStrategy implements DiscountStrategy {
    @Override
    public double apply(CartContext cart, double discountValue) {
        if (cart.getItemCount() < 2) {
            return cart.getCartTotal();
        }
        double averageItemPrice = cart.getCartTotal() / cart.getItemCount();
        int freeItems = cart.getItemCount() / 2;
        return Math.max(0, cart.getCartTotal() - (freeItems * averageItemPrice));
    }
}
