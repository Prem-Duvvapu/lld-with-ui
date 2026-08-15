package com.lld.digitalwallet.service;

import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.repository.WalletRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class WalletService {
    private final WalletRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public WalletService(WalletRepository repository) {
        this.repository = repository;
    }

    public Wallet createWallet(String userId, String userName) {
        lock.lock();
        try {
            Wallet wallet = new Wallet(repository.nextWalletId(), userId, userName, 0.0, "INR", LocalDateTime.now());
            return repository.saveWallet(wallet);
        } finally {
            lock.unlock();
        }
    }

    public double getBalance(Long walletId) {
        Wallet wallet = repository.findWalletById(walletId);
        if (wallet == null) throw new IllegalArgumentException("Wallet not found");
        return wallet.getBalance();
    }

    public Map<String, Object> addFunds(Long walletId, double amount, String paymentMethod) {
        lock.lock();
        try {
            Wallet wallet = repository.findWalletById(walletId);
            if (wallet == null) throw new IllegalArgumentException("Wallet not found");
            if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");

            wallet.setBalance(wallet.getBalance() + amount);

            Transaction txn = new Transaction(repository.nextTransactionId(), null, walletId, amount,
                "CREDIT", "COMPLETED", LocalDateTime.now(),
                "Added via " + paymentMethod);
            txn.setWalletId(walletId);
            repository.addTransaction(txn);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("newBalance", wallet.getBalance());
            result.put("transaction", txn);
            return result;
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> sendMoney(Long fromWalletId, Long toWalletId, double amount, String description) {
        lock.lock();
        try {
            Wallet from = repository.findWalletById(fromWalletId);
            Wallet to = repository.findWalletById(toWalletId);
            if (from == null) throw new IllegalArgumentException("Sender wallet not found");
            if (to == null) throw new IllegalArgumentException("Recipient wallet not found");
            if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");
            if (from.getBalance() < amount) throw new IllegalArgumentException("Insufficient balance");

            from.setBalance(from.getBalance() - amount);
            to.setBalance(to.getBalance() + amount);

            Transaction txn = new Transaction(repository.nextTransactionId(), fromWalletId, toWalletId, amount,
                "TRANSFER", "COMPLETED", LocalDateTime.now(),
                description != null ? description : "Transfer");
            txn.setWalletId(fromWalletId);
            repository.addTransaction(txn);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("fromBalance", from.getBalance());
            result.put("toBalance", to.getBalance());
            result.put("transaction", txn);
            return result;
        } finally {
            lock.unlock();
        }
    }

    public List<Transaction> getTransactions(Long walletId) {
        if (repository.findWalletById(walletId) == null) throw new IllegalArgumentException("Wallet not found");
        return repository.getTransactionsByWalletId(walletId);
    }

    public List<Wallet> getAllWallets() {
        return repository.getAllWallets();
    }

    public Wallet getWallet(Long walletId) {
        return repository.findWalletById(walletId);
    }
}