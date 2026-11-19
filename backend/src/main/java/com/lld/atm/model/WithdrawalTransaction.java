package com.lld.atm.model;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
public class WithdrawalTransaction extends Transaction {
    @Setter
    private Map<NoteDenomination, Integer> dispensedNotes;

    public WithdrawalTransaction(String transactionId, String accountNumber, double amount) {
        super(transactionId, accountNumber, TransactionType.WITHDRAWAL, amount);
    }

    private WithdrawalTransaction(WithdrawalTransaction source) {
        super(source);
        this.dispensedNotes = source.dispensedNotes == null ? null : new java.util.LinkedHashMap<>(source.dispensedNotes);
    }

    @Override public WithdrawalTransaction detachedCopy() { return new WithdrawalTransaction(this); }
}
