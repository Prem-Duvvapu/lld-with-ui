package com.lld.coupon.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** The cart-shaped input every eligibility check and discount calculation reads from. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartContext {
    private double cartTotal;
    private int itemCount;
    private String category;
    private boolean firstOrder;
}
