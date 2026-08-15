package com.lld.vendingmachine.model;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public class Transaction {
    private long id;
    private String slotCode;
    private Long productId;
    private String productName;
    private double itemPrice;
    private double insertedAmount;
    private double changeAmount;
    private Map<String, Integer> denominationsInserted = new HashMap<>();
    private Map<String, Integer> changeBreakdown = new HashMap<>();
    private String status; // PENDING, PAID, DISPENSED, CANCELLED, REFUNDED, FAILED
    private LocalDateTime timestamp;
    private String message;

    public Transaction() {
        this.timestamp = LocalDateTime.now();
        this.status = "PENDING";
    }

    public Transaction(long id, String slotCode, Long productId, String productName, double itemPrice) {
        this.id = id;
        this.slotCode = slotCode;
        this.productId = productId;
        this.productName = productName;
        this.itemPrice = itemPrice;
        this.insertedAmount = 0.0;
        this.changeAmount = 0.0;
        this.denominationsInserted = new HashMap<>();
        this.changeBreakdown = new HashMap<>();
        this.status = "PENDING";
        this.timestamp = LocalDateTime.now();
        this.message = "Transaction initiated for " + productName + " (" + slotCode + ")";
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getSlotCode() { return slotCode; }
    public void setSlotCode(String slotCode) { this.slotCode = slotCode; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public double getItemPrice() { return itemPrice; }
    public void setItemPrice(double itemPrice) { this.itemPrice = itemPrice; }

    public double getInsertedAmount() { return insertedAmount; }
    public void setInsertedAmount(double insertedAmount) { this.insertedAmount = insertedAmount; }

    public double getChangeAmount() { return changeAmount; }
    public void setChangeAmount(double changeAmount) { this.changeAmount = changeAmount; }

    public Map<String, Integer> getDenominationsInserted() { return denominationsInserted; }
    public void setDenominationsInserted(Map<String, Integer> denominationsInserted) { this.denominationsInserted = denominationsInserted; }

    public Map<String, Integer> getChangeBreakdown() { return changeBreakdown; }
    public void setChangeBreakdown(Map<String, Integer> changeBreakdown) { this.changeBreakdown = changeBreakdown; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public void addInsertedDenomination(Denomination denom) {
        this.insertedAmount += denom.getValue();
        this.denominationsInserted.merge(denom.name(), 1, Integer::sum);
    }
}
