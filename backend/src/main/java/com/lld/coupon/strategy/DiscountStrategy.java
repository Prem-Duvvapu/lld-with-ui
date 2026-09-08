package com.lld.coupon.strategy;

import com.lld.coupon.model.CartContext;

/** Computes the post-discount cart total. Never mutates the cart or the coupon. */
public interface DiscountStrategy {
    double apply(CartContext cart, double discountValue);
}
