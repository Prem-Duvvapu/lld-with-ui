package com.lld.coffeemachine.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    public long getOrderId() { return orderId; }
    public void setOrderId(long orderId) { this.orderId = orderId; }

    public String getBaseCoffeeName() { return baseCoffeeName; }
    public void setBaseCoffeeName(String baseCoffeeName) { this.baseCoffeeName = baseCoffeeName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }

    public double getAmountPaid() { return amountPaid; }
    public void setAmountPaid(double amountPaid) { this.amountPaid = amountPaid; }

    public double getChangeReturned() { return changeReturned; }
    public void setChangeReturned(double changeReturned) { this.changeReturned = changeReturned; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<String> getCustomizations() { return customizations; }
    public void setCustomizations(List<String> customizations) { this.customizations = customizations; }

    public Map<String, Integer> getRequiredIngredients() { return requiredIngredients; }
    public void setRequiredIngredients(Map<String, Integer> requiredIngredients) { this.requiredIngredients = requiredIngredients; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
