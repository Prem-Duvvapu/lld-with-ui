package com.lld.digitalwallet.model;

import java.time.LocalDateTime;

public class Wallet {
    private long id;
    private String userId;
    private String userName;
    private double balance;
    private String currency;
    private LocalDateTime createdAt;

    public Wallet() {}

    public Wallet(long id, String userId, String userName, double balance, String currency, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.userName = userName;
        this.balance = balance;
        this.currency = currency;
        this.createdAt = createdAt;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public double getBalance() { return balance; }
    public void setBalance(double balance) { this.balance = balance; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}