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
}
