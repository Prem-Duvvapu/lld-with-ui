package com.lld.atm.model;

import java.util.Map;

public abstract class Transaction {
    private final String transactionId;
    private final String accountNumber;
    private final TransactionType type;
    private final double amount;
    private final long timestampEpoch;
    private String status; // "SUCCESS", "FAILED"
    private String failureReason;

    public Transaction(String transactionId, String accountNumber, TransactionType type, double amount) {
        this.transactionId = transactionId;
        this.accountNumber = accountNumber;
        this.type = type;
        this.amount = amount;
        this.timestampEpoch = System.currentTimeMillis();
        this.status = "SUCCESS";
    }

    public String getTransactionId() {
        return transactionId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public TransactionType getType() {
        return type;
    }

    public double getAmount() {
        return amount;
    }

    public long getTimestampEpoch() {
        return timestampEpoch;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}
