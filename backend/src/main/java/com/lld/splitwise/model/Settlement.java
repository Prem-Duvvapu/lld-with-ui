package com.lld.splitwise.model;

import java.time.LocalDateTime;

public class Settlement {
    private long id;
    private User fromUser;
    private User toUser;
    private double amount;
    private long groupId;
    private LocalDateTime timestamp;

    public Settlement() {}

    public Settlement(long id, User fromUser, User toUser, double amount, long groupId, LocalDateTime timestamp) {
        this.id = id;
        this.fromUser = fromUser;
        this.toUser = toUser;
        this.amount = amount;
        this.groupId = groupId;
        this.timestamp = timestamp;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public User getFromUser() { return fromUser; }
    public void setFromUser(User fromUser) { this.fromUser = fromUser; }
    public User getToUser() { return toUser; }
    public void setToUser(User toUser) { this.toUser = toUser; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public long getGroupId() { return groupId; }
    public void setGroupId(long groupId) { this.groupId = groupId; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
