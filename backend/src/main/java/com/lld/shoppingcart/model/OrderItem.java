package com.lld.shoppingcart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/** Immutable snapshot of a {@link CartItem} taken at checkout time — an {@link Order}'s items must
 * never change even if the catalog price of the underlying {@link Product} changes later. */
@Data
@Builder
@AllArgsConstructor
public class OrderItem {
    private final String productId;
    private final String productName;
    private final double unitPrice;
    private final int quantity;

    public double getTotalPrice() {
        return unitPrice * quantity;
    }
}
