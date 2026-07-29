package com.lld.atm.model;

public class Account {
    private long id;
    private String accountNumber;
    private String pin;
    private String holderName;
    private double balance;

    public Account() {}

    public Account(long id, String accountNumber, String pin, String holderName, double balance) {
        this.id = id;
        this.accountNumber = accountNumber;
        this.pin = pin;
        this.holderName = holderName;
        this.balance = balance;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getPin() {
        return pin;
    }

    public void setPin(String pin) {
        this.pin = pin;
    }

    public String getHolderName() {
        return holderName;
    }

    public void setHolderName(String holderName) {
        this.holderName = holderName;
    }

    public double getBalance() {
        return balance;
    }

    public void setBalance(double balance) {
        this.balance = balance;
    }
}
