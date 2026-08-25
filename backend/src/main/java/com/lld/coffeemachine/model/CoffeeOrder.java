package com.lld.coffeemachine.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class CoffeeOrder {
    private long orderId;
    private String baseCoffeeName;
    private String description;
    private double totalPrice;
    private double amountPaid;
    private double changeReturned;
    private String status; // CREATED, PAID, BREWING, DISPENSED, CANCELLED, FAILED
    private List<String> customizations = new ArrayList<>();
    private Map<String, Integer> requiredIngredients = new HashMap<>();
    private LocalDateTime timestamp;
    private String message;

    public CoffeeOrder() {
        this.timestamp = LocalDateTime.now();
        this.status = "CREATED";
    }

    public CoffeeOrder(long orderId, String baseCoffeeName, String description, double totalPrice) {
        this.orderId = orderId;
        this.baseCoffeeName = baseCoffeeName;
        this.description = description;
        this.totalPrice = totalPrice;
        this.amountPaid = 0.0;
        this.changeReturned = 0.0;
        this.status = "CREATED";
        this.customizations = new ArrayList<>();
        this.requiredIngredients = new HashMap<>();
        this.timestamp = LocalDateTime.now();
        this.message = "Order initiated for " + description + " (₹" + totalPrice + ")";
    }
}
