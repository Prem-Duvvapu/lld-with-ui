package com.lld.shoppingcart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/** A single line item inside a live {@link Cart}. {@code quantity} is mutable — it is what
 * {@link com.lld.shoppingcart.command.UpdateQuantityCommand} rewrites in place. */
@Data
@Builder
@AllArgsConstructor
public class CartItem {
    private final String productId;
    private final String productName;
    private final double unitPrice;
    private int quantity;

    public double getTotalPrice() {
        return unitPrice * quantity;
    }
}
