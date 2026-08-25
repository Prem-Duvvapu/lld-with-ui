package com.lld.vendingmachine.model;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
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

    public void addInsertedDenomination(Denomination denom) {
        this.insertedAmount += denom.getValue();
        this.denominationsInserted.merge(denom.name(), 1, Integer::sum);
    }
}
