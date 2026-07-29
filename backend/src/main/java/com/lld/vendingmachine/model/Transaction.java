package com.lld.vendingmachine.model;

import java.time.LocalDateTime;
import java.util.List;

public class Transaction {
    private long id;
    private List<Long> selectedProductIds;
    private List<Integer> quantities;
    private double totalAmount;
    private double insertedAmount;
    private double change;
    private String status;
    private LocalDateTime timestamp;

    public Transaction() {}

    public Transaction(long id, List<Long> selectedProductIds, List<Integer> quantities, double totalAmount) {
        this.id = id;
        this.selectedProductIds = selectedProductIds;
        this.quantities = quantities;
        this.totalAmount = totalAmount;
        this.insertedAmount = 0;
        this.change = 0;
        this.status = "PENDING";
        this.timestamp = LocalDateTime.now();
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public List<Long> getSelectedProductIds() { return selectedProductIds; }
    public void setSelectedProductIds(List<Long> selectedProductIds) { this.selectedProductIds = selectedProductIds; }
    public List<Integer> getQuantities() { return quantities; }
    public void setQuantities(List<Integer> quantities) { this.quantities = quantities; }
    public double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(double totalAmount) { this.totalAmount = totalAmount; }
    public double getInsertedAmount() { return insertedAmount; }
    public void setInsertedAmount(double insertedAmount) { this.insertedAmount = insertedAmount; }
    public double getChange() { return change; }
    public void setChange(double change) { this.change = change; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
