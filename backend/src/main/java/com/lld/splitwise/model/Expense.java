package com.lld.splitwise.model;

import java.time.LocalDateTime;
import java.util.List;

public class Expense {
    private long id;
    private String description;
    private double amount;
    private User paidBy;
    private long groupId;
    private List<Split> splits;
    private LocalDateTime createdAt;

    public Expense() {}

    public Expense(long id, String description, double amount, User paidBy, long groupId, List<Split> splits, LocalDateTime createdAt) {
        this.id = id;
        this.description = description;
        this.amount = amount;
        this.paidBy = paidBy;
        this.groupId = groupId;
        this.splits = splits;
        this.createdAt = createdAt;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public User getPaidBy() { return paidBy; }
    public void setPaidBy(User paidBy) { this.paidBy = paidBy; }
    public long getGroupId() { return groupId; }
    public void setGroupId(long groupId) { this.groupId = groupId; }
    public List<Split> getSplits() { return splits; }
    public void setSplits(List<Split> splits) { this.splits = splits; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
