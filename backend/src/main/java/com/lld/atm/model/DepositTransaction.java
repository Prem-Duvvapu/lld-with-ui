package com.lld.atm.model;

import com.lld.atm.model.NoteDenomination;
import com.lld.atm.model.Transaction;
import com.lld.atm.model.TransactionType;

import java.util.Map;

public class DepositTransaction extends Transaction {
    private Map<NoteDenomination, Integer> depositedNotes;

    public DepositTransaction(String transactionId, String accountNumber, double amount, Map<NoteDenomination, Integer> depositedNotes) {
        super(transactionId, accountNumber, TransactionType.DEPOSIT, amount);
        this.depositedNotes = depositedNotes;
    }

    public Map<NoteDenomination, Integer> getDepositedNotes() {
        return depositedNotes;
    }
}
