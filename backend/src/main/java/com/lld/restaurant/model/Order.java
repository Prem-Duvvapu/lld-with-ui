package com.lld.restaurant.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    private String id;
    private String tableId;
    private String waiterName;
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();
    @Builder.Default
    private OrderStatus status = OrderStatus.PLACED;
    private String notes;
    @Builder.Default
    private Instant createdAt = Instant.now();
    private double subtotal;
}
