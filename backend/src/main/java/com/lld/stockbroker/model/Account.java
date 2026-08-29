package com.lld.stockbroker.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.lld.stockbroker.exception.InsufficientFundsException;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;

import java.util.concurrent.locks.ReentrantLock;

/**
 * A trading account. {@code cashBalance}/{@code reservedBalance} are the fields every concurrent
 * buy/sell races on, guarded end to end by {@link #accountLock} — a fair, per-account
 * {@code ReentrantLock} so two customers' orders never block each other, only two orders against
 * the *same* account do. This was the original hand-rolled precedent that
 * {@code com.lld.atm.model.Account} / {@code com.lld.library.model.Member} later copied: Lombok
 * {@code @Getter} only (not {@code @Data}) because a mutable {@code ReentrantLock} field must
 * never end up in a generated {@code equals}/{@code hashCode}/{@code toString}, which
 * {@code @Data} would do by default, and {@code @JsonIgnore} on the lock's own getter keeps it out
 * of every JSON response.
 */
@Getter
@Builder
public class Account {
    private final String accountId;
    private final String userId;
    private final Portfolio portfolio;
    private double cashBalance;
    private double reservedBalance;
    @Builder.Default
    @Getter(AccessLevel.NONE)
    private final ReentrantLock accountLock = new ReentrantLock(true);

    /** Opens a new account with a non-negative starting cash balance and an empty portfolio. */
    public static Account open(String accountId, String userId, double initialDeposit) {
        return Account.builder()
                .accountId(accountId)
                .userId(userId)
                .portfolio(Portfolio.empty(accountId))
                .cashBalance(Math.max(0.0, initialDeposit))
                .reservedBalance(0.0)
                .build();
    }

    @JsonIgnore
    public ReentrantLock getLock() {
        return accountLock;
    }

    public double getAvailableBalance() {
        return Math.max(0.0, cashBalance - reservedBalance);
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
