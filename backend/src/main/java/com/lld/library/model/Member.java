package com.lld.library.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.lld.library.enums.MemberType;
import lombok.AccessLevel;
import lombok.Getter;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Lombok {@code @Getter} only (not {@code @Data}), matching {@code atm.model.Account}'s precedent
 * (itself modeled on this class): a mutable {@code ReentrantLock} must never end up in a
 * generated {@code equals}/{@code hashCode}/{@code toString}, and {@code activeLoanCount} needs its
 * derived-int accessor kept hand-written since Lombok would otherwise try to generate a second,
 * conflicting {@code getActiveLoanCount()} returning the raw {@code AtomicInteger}.
 */
@Getter
public class Member {
    private final String id;
    private final String name;
    private final String email;
    private final MemberType type;
    private final LoanPolicy loanPolicy;
    @Getter(AccessLevel.NONE)
    private final AtomicInteger activeLoanCount = new AtomicInteger(0);
    private volatile double accruedFineBalance = 0.0;
    @Getter(AccessLevel.NONE)
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

    public int getActiveLoanCount() {
        return activeLoanCount.get();
    }

    public int incrementLoanCount() {
        return activeLoanCount.incrementAndGet();
    }

    public int decrementLoanCount() {
        return activeLoanCount.decrementAndGet();
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

    @JsonIgnore
    public ReentrantLock getLock() {
        return memberLock;
    }
}
