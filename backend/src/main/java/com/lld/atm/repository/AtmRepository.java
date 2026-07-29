package com.lld.atm.repository;

import com.lld.atm.model.Account;
import com.lld.atm.model.Transaction;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

@Repository
public class AtmRepository {
    private final Map<Long, Account> accounts = new ConcurrentHashMap<>();
    private final Map<String, Long> accountByNumber = new ConcurrentHashMap<>();
    private final Map<Long, List<Transaction>> transactions = new ConcurrentHashMap<>();
    private final AtomicLong accountIdGen = new AtomicLong(1);
    private final AtomicLong transactionIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public AtmRepository() {
        saveAccount(new Account(accountIdGen.getAndIncrement(), "123456", "1234", "Alice", 5000.0));
        saveAccount(new Account(accountIdGen.getAndIncrement(), "789012", "5678", "Bob", 3000.0));
        saveAccount(new Account(accountIdGen.getAndIncrement(), "345678", "9012", "Charlie", 10000.0));
    }

    public void saveAccount(Account account) {
        lock.lock();
        try {
            accounts.put(account.getId(), account);
            accountByNumber.put(account.getAccountNumber(), account.getId());
        } finally {
            lock.unlock();
        }
    }

    public Account findAccountByNumber(String accountNumber) {
        Long id = accountByNumber.get(accountNumber);
        if (id == null) return null;
        return accounts.get(id);
    }

    public Account findAccountById(Long id) {
        return accounts.get(id);
    }

    public void updateBalance(Account account) {
        lock.lock();
        try {
            accounts.put(account.getId(), account);
        } finally {
            lock.unlock();
        }
    }

    public Transaction addTransaction(Transaction transaction) {
        lock.lock();
        try {
            Long accountId = accountByNumber.get(transaction.getAccountNumber());
            transactions.computeIfAbsent(accountId, k -> new ArrayList<>()).add(transaction);
            return transaction;
        } finally {
            lock.unlock();
        }
    }

    public List<Transaction> getTransactions(String accountNumber) {
        Long accountId = accountByNumber.get(accountNumber);
        if (accountId == null) return new ArrayList<>();
        List<Transaction> txnList = transactions.get(accountId);
        return txnList != null ? new ArrayList<>(txnList) : new ArrayList<>();
    }

    public long nextTransactionId() {
        return transactionIdGen.getAndIncrement();
    }
}
