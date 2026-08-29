package com.lld.atm.model;

import lombok.Getter;
import lombok.Setter;

/**
 * Base of the transaction hierarchy — {@link WithdrawalTransaction} and {@link DepositTransaction}
 * each add the denomination breakdown their transaction type actually needs. A plain constructor
 * (not {@code @Builder}) on purpose: {@code transactionId}/{@code timestampEpoch}/the initial
 * {@code SUCCESS} status are derived at construction time, not caller-supplied fields, so a builder
 * would let a caller accidentally set an inconsistent timestamp or skip the id.
 */
@Getter
public abstract class Transaction {
    private final String transactionId;
    private final String accountNumber;
    private final TransactionType type;
    private final double amount;
    private final long timestampEpoch;
    @Setter
    private String status; // "SUCCESS", "FAILED"
    @Setter
    private String failureReason;

    public Transaction(String transactionId, String accountNumber, TransactionType type, double amount) {
        this.transactionId = transactionId;
        this.accountNumber = accountNumber;
        this.type = type;
        this.amount = amount;
        this.timestampEpoch = System.currentTimeMillis();
        this.status = "SUCCESS";
    }
}
