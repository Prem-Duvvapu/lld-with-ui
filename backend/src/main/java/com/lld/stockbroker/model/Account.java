package com.lld.stockbroker.model;

import com.lld.stockbroker.exception.InsufficientFundsException;

import java.util.concurrent.locks.ReentrantLock;

public class Account {
    private final String accountId;
    private final String userId;
    private final Portfolio portfolio;
    private volatile double cashBalance;
    private volatile double reservedBalance;
    private final ReentrantLock accountLock = new ReentrantLock(true);

    public Account(String accountId, String userId, double initialDeposit) {
        this.accountId = accountId;
        this.userId = userId;
        this.portfolio = new Portfolio(accountId);
        this.cashBalance = Math.max(0.0, initialDeposit);
        this.reservedBalance = 0.0;
    }

    public String getAccountId() {
        return accountId;
    }

    public String getUserId() {
        return userId;
    }

    public Portfolio getPortfolio() {
        return portfolio;
    }

    public double getCashBalance() {
        return cashBalance;
    }

    public double getReservedBalance() {
        return reservedBalance;
    }

    public double getAvailableBalance() {
        return Math.max(0.0, cashBalance - reservedBalance);
    }

    public ReentrantLock getLock() {
        return accountLock;
    }

    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Deposit amount must be positive");
        accountLock.lock();
        try {
            cashBalance += amount;
        } finally {
            accountLock.unlock();
        }
    }

    public void withdraw(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Withdrawal amount must be positive");
        accountLock.lock();
        try {
            if (getAvailableBalance() < amount) {
                throw new InsufficientFundsException("Insufficient available funds for withdrawal. Available: ₹" +
                        getAvailableBalance() + ", Requested: ₹" + amount);
            }
            cashBalance -= amount;
        } finally {
            accountLock.unlock();
        }
    }

    public void reserveFunds(double amount) {
        accountLock.lock();
        try {
            if (getAvailableBalance() < amount) {
                throw new InsufficientFundsException(String.format(
                        "Insufficient available funds. Available: ₹%.2f, Required: ₹%.2f",
                        getAvailableBalance(), amount));
            }
            reservedBalance += amount;
        } finally {
            accountLock.unlock();
        }
    }

    public void releaseReservedFunds(double amount) {
        accountLock.lock();
        try {
            double release = Math.min(amount, reservedBalance);
            reservedBalance -= release;
        } finally {
            accountLock.unlock();
        }
    }

    public void settleBuy(double executedCost, double reservedCostToRelease) {
        accountLock.lock();
        try {
            cashBalance -= executedCost;
            double release = Math.min(reservedCostToRelease, reservedBalance);
            reservedBalance -= release;
        } finally {
            accountLock.unlock();
        }
    }

    public void settleSell(double proceeds) {
        accountLock.lock();
        try {
            cashBalance += proceeds;
        } finally {
            accountLock.unlock();
        }
    }
}
