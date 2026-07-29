package com.lld.coffeemachine.model;

import java.time.LocalDateTime;

public class Order {
    private long id;
    private long beverageId;
    private String beverageName;
    private LocalDateTime timestamp;
    private String status;

    public Order() {}

    public Order(long id, long beverageId, String beverageName, LocalDateTime timestamp, String status) {
        this.id = id;
        this.beverageId = beverageId;
        this.beverageName = beverageName;
        this.timestamp = timestamp;
        this.status = status;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public long getBeverageId() { return beverageId; }
    public void setBeverageId(long beverageId) { this.beverageId = beverageId; }
    public String getBeverageName() { return beverageName; }
    public void setBeverageName(String beverageName) { this.beverageName = beverageName; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}