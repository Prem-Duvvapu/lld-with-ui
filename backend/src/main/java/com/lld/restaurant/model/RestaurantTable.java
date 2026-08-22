package com.lld.restaurant.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantTable {
    private String id;
    private int number;
    private int capacity;
    @Builder.Default
    private TableStatus status = TableStatus.AVAILABLE;
    private String currentOrderId;
}
