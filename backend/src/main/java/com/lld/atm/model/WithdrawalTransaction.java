package com.lld.atm.model;

import java.util.Map;

public class WithdrawalTransaction extends Transaction {
    private Map<NoteDenomination, Integer> dispensedNotes;

    public WithdrawalTransaction(String transactionId, String accountNumber, double amount) {
        super(transactionId, accountNumber, TransactionType.WITHDRAWAL, amount);
    }

    public Map<NoteDenomination, Integer> getDispensedNotes() {
        return dispensedNotes;
    }

    public void setDispensedNotes(Map<NoteDenomination, Integer> dispensedNotes) {
        this.dispensedNotes = dispensedNotes;
    }
}
