package com.lld.splitwise.model;

public class Split {
    private long id;
    private User user;
    private double amount;
    private double percentage;
    private SplitType type;

    public Split() {}

    public Split(long id, User user, double amount, double percentage, SplitType type) {
        this.id = id;
        this.user = user;
        this.amount = amount;
        this.percentage = percentage;
        this.type = type;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }
    public SplitType getType() { return type; }
    public void setType(SplitType type) { this.type = type; }
}
