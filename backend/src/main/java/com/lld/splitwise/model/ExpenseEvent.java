package com.lld.splitwise.model;

import java.time.LocalDateTime;
import java.util.Map;

public class ExpenseEvent {
    private long id;
    private String type; // "EXPENSE_ADDED", "SETTLEMENT", "USER_CREATED", "GROUP_CREATED"
    private String actor;
    private String description;
    private Map<String, Object> data;
    private Map<String, Double> balanceSnapshot;
    private LocalDateTime timestamp;

    public ExpenseEvent() {}

    public ExpenseEvent(long id, String type, String actor, String description, Map<String, Object> data, Map<String, Double> balanceSnapshot, LocalDateTime timestamp) {
        this.id = id;
        this.type = type;
        this.actor = actor;
        this.description = description;
        this.data = data;
        this.balanceSnapshot = balanceSnapshot;
        this.timestamp = timestamp;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }
    public Map<String, Double> getBalanceSnapshot() { return balanceSnapshot; }
    public void setBalanceSnapshot(Map<String, Double> balanceSnapshot) { this.balanceSnapshot = balanceSnapshot; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
