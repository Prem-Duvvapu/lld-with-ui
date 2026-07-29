package com.lld.digitalwallet.repository;

import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class WalletRepository {
    private final Map<Long, Wallet> wallets = new ConcurrentHashMap<>();
    private final Map<Long, List<Transaction>> transactions = new ConcurrentHashMap<>();
    private final AtomicLong walletIdGen = new AtomicLong(1);
    private final AtomicLong transactionIdGen = new AtomicLong(1);

    public WalletRepository() {
        saveWallet(new Wallet(walletIdGen.getAndIncrement(), "user1", "Alice", 5000.0, "INR", LocalDateTime.now()));
        saveWallet(new Wallet(walletIdGen.getAndIncrement(), "user2", "Bob", 3000.0, "INR", LocalDateTime.now()));
        saveWallet(new Wallet(walletIdGen.getAndIncrement(), "user3", "Charlie", 10000.0, "INR", LocalDateTime.now()));
    }

    public Wallet saveWallet(Wallet wallet) {
        wallets.put(wallet.getId(), wallet);
        return wallet;
    }

    public Wallet findWalletById(Long id) {
        return wallets.get(id);
    }

    public List<Wallet> getAllWallets() {
        return new ArrayList<>(wallets.values());
    }

    public void addTransaction(Transaction txn) {
        transactions.computeIfAbsent(txn.getWalletId() != null ? txn.getWalletId() : txn.getFromWalletId(), k -> Collections.synchronizedList(new ArrayList<>())).add(txn);
        if (txn.getToWalletId() != null && !txn.getToWalletId().equals(txn.getWalletId()) && !txn.getToWalletId().equals(txn.getFromWalletId())) {
            transactions.computeIfAbsent(txn.getToWalletId(), k -> Collections.synchronizedList(new ArrayList<>())).add(txn);
        }
    }

    public List<Transaction> getTransactionsByWalletId(Long walletId) {
        List<Transaction> txns = transactions.get(walletId);
        return txns != null ? new ArrayList<>(txns) : new ArrayList<>();
    }

    public long nextWalletId() { return walletIdGen.getAndIncrement(); }
    public long nextTransactionId() { return transactionIdGen.getAndIncrement(); }
}