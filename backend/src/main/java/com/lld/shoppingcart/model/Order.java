package com.lld.shoppingcart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * A placed order — an immutable line-item snapshot plus mutable lifecycle state. {@code @Data}
 * generates getters for every field and setters only for the two genuinely mutable ones
 * ({@code status}, {@code paymentTransactionId}); the 5-arg constructor stays hand-written because
 * it does real defaulting (status starts at {@code PLACED}, {@code createdAtEpoch} is stamped at
 * construction) that a plain Lombok all-args constructor could not express. The extra
 * {@code @AllArgsConstructor} (a different, 8-arg signature — Java allows both to coexist) exists
 * only so {@code @Builder} has a full-fields constructor to call internally; nothing outside this
 * class is expected to use it directly. {@code @Builder.Default} mirrors the 5-arg constructor's
 * own defaults so tests can construct one field-by-field without depending on the live clock.
 */
@Data
@Builder
@AllArgsConstructor
public class Order {
    private final String orderId;
    private final String userId;
    private final List<OrderItem> items;
    private final double totalAmount;
    @Builder.Default
    private OrderStatus status = OrderStatus.PLACED;
    private String paymentTransactionId;
    private final PaymentMethod paymentMethod;
    @Builder.Default
    private final long createdAtEpoch = System.currentTimeMillis();

    public Order(String orderId, String userId, List<OrderItem> items, double totalAmount, PaymentMethod paymentMethod) {
        this.orderId = orderId;
        this.userId = userId;
        this.items = items;
        this.totalAmount = totalAmount;
        this.paymentMethod = paymentMethod;
        this.status = OrderStatus.PLACED;
        this.createdAtEpoch = System.currentTimeMillis();
    }
}
