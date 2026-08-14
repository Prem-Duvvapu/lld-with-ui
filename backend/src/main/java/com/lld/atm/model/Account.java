package com.lld.atm.model;

import java.util.concurrent.locks.ReentrantLock;

public class Account {
    private final String id;
    private final String accountNumber;
    private final String holderName;
    private double balance;
    private final ReentrantLock accountLock = new ReentrantLock(true);

    public Account(String id, String accountNumber, String holderName, double initialBalance) {
        this.id = id;
        this.accountNumber = accountNumber;
        this.holderName = holderName;
        this.balance = initialBalance;
    }

    public String getId() {
        return id;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public String getHolderName() {
        return holderName;
    }

    public double getBalance() {
        return balance;
    }

    public void setBalance(double balance) {
        this.balance = balance;
    }

    public ReentrantLock getLock() {
        return accountLock;
    }
}
