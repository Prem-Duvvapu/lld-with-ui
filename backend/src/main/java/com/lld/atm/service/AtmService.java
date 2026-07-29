package com.lld.atm.service;

import com.lld.atm.model.Account;
import com.lld.atm.model.Transaction;
import com.lld.atm.model.TransactionType;
import com.lld.atm.repository.AtmRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class AtmService {
    private final AtmRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public AtmService(AtmRepository repository) {
        this.repository = repository;
    }

    public Account authenticate(String cardNumber, String pin) {
        Account account = repository.findAccountByNumber(cardNumber);
        if (account == null || !account.getPin().equals(pin)) {
            throw new IllegalArgumentException("Invalid card number or PIN");
        }
        return account;
    }

    public double getBalance(String accountNumber) {
        Account account = repository.findAccountByNumber(accountNumber);
        if (account == null) {
            throw new IllegalArgumentException("Account not found");
        }
        return account.getBalance();
    }

    public Transaction withdraw(String accountNumber, double amount) {
        lock.lock();
        try {
            Account account = repository.findAccountByNumber(accountNumber);
            if (account == null) {
                Transaction txn = new Transaction(
                    repository.nextTransactionId(), accountNumber, TransactionType.WITHDRAWAL,
                    amount, LocalDateTime.now(), "FAILED", "Account not found"
                );
                return repository.addTransaction(txn);
            }
            if (account.getBalance() < amount) {
                Transaction txn = new Transaction(
                    repository.nextTransactionId(), accountNumber, TransactionType.WITHDRAWAL,
                    amount, LocalDateTime.now(), "FAILED", "Insufficient balance"
                );
                return repository.addTransaction(txn);
            }
            account.setBalance(account.getBalance() - amount);
            repository.updateBalance(account);
            Transaction txn = new Transaction(
                repository.nextTransactionId(), accountNumber, TransactionType.WITHDRAWAL,
                amount, LocalDateTime.now(), "SUCCESS", "Amount dispensed"
            );
            return repository.addTransaction(txn);
        } finally {
            lock.unlock();
        }
    }

    public Transaction deposit(String accountNumber, double amount) {
        lock.lock();
        try {
            Account account = repository.findAccountByNumber(accountNumber);
            if (account == null) {
                Transaction txn = new Transaction(
                    repository.nextTransactionId(), accountNumber, TransactionType.DEPOSIT,
                    amount, LocalDateTime.now(), "FAILED", "Account not found"
                );
                return repository.addTransaction(txn);
            }
            account.setBalance(account.getBalance() + amount);
            repository.updateBalance(account);
            Transaction txn = new Transaction(
                repository.nextTransactionId(), accountNumber, TransactionType.DEPOSIT,
                amount, LocalDateTime.now(), "SUCCESS", "Deposit successful"
            );
            return repository.addTransaction(txn);
        } finally {
            lock.unlock();
        }
    }

    public List<Transaction> getTransactions(String accountNumber) {
        Account account = repository.findAccountByNumber(accountNumber);
        if (account == null) {
            throw new IllegalArgumentException("Account not found");
        }
        return repository.getTransactions(accountNumber);
    }
}
