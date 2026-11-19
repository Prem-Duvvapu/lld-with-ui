package com.lld.atm.model;

import lombok.Getter;

import java.util.Map;

@Getter
public class DepositTransaction extends Transaction {
    private final Map<NoteDenomination, Integer> depositedNotes;

    public DepositTransaction(String transactionId, String accountNumber, double amount, Map<NoteDenomination, Integer> depositedNotes) {
        super(transactionId, accountNumber, TransactionType.DEPOSIT, amount);
        this.depositedNotes = depositedNotes;
    }

    private DepositTransaction(DepositTransaction source) {
        super(source);
        this.depositedNotes = source.depositedNotes == null ? null : new java.util.LinkedHashMap<>(source.depositedNotes);
    }

    @Override public DepositTransaction detachedCopy() { return new DepositTransaction(this); }
}
