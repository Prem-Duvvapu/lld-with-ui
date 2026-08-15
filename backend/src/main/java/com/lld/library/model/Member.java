package com.lld.library.model;

import com.lld.library.enums.MemberType;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

public class Member {
    private final String id;
    private final String name;
    private final String email;
    private final MemberType type;
    private final LoanPolicy loanPolicy;
    private final AtomicInteger activeLoanCount = new AtomicInteger(0);
    private volatile double accruedFineBalance = 0.0;
    private final ReentrantLock memberLock = new ReentrantLock(true);

    public Member(String id, String name, String email, MemberType type, LoanPolicy policy) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Member ID cannot be null or empty");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be null or empty");
        }
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        this.id = id.trim();
        this.name = name.trim();
        this.email = email.trim().toLowerCase();
        this.type = type != null ? type : MemberType.GENERAL;
        this.loanPolicy = policy;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public MemberType getType() {
        return type;
    }

    public LoanPolicy getLoanPolicy() {
        return loanPolicy;
    }

    public int getActiveLoanCount() {
        return activeLoanCount.get();
    }

    public int incrementLoanCount() {
        return activeLoanCount.incrementAndGet();
    }

    public int decrementLoanCount() {
        return activeLoanCount.decrementAndGet();
    }

    public double getAccruedFineBalance() {
        return accruedFineBalance;
    }

    public synchronized void addFine(double amount) {
        if (amount > 0) {
            this.accruedFineBalance += amount;
        }
    }

    public synchronized void payFine(double amount) {
        if (amount > 0) {
            this.accruedFineBalance = Math.max(0.0, this.accruedFineBalance - amount);
        }
    }

    public ReentrantLock getLock() {
        return memberLock;
    }
}
