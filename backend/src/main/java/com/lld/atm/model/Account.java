package com.lld.atm.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;

import java.util.concurrent.locks.ReentrantLock;

/**
 * A bank account. {@code balance} is the one field every withdrawal/deposit races on, guarded by
 * {@link #accountLock} — a fair, per-account {@code ReentrantLock} rather than a class-wide lock,
 * so two customers withdrawing from two different accounts never block each other.
 *
 * <p>Lombok {@code @Getter} only (not {@code @Data}) matching {@code com.lld.stockbroker.model.Account}
 * / {@code com.lld.library.model.Member}'s hand-rolled precedent: a mutable {@code ReentrantLock}
 * field must never end up in a generated {@code equals}/{@code hashCode}/{@code toString}, which
 * {@code @Data} would do by default. {@code setBalance} stays a plain hand-written mutator — every
 * caller is expected to be holding {@link #accountLock} already.
 */
@Getter
@Builder
public class Account {
    private final String id;
    private final String accountNumber;
    private final String holderName;
    private double balance;
    @Builder.Default
    @Getter(AccessLevel.NONE)
    private final ReentrantLock accountLock = new ReentrantLock(true);

    public void setBalance(double balance) {
        this.balance = balance;
    }

    @JsonIgnore
    public ReentrantLock getLock() {
        return accountLock;
    }
}
