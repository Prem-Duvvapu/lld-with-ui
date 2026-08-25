package com.lld.digitalwallet.repository;

import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory store for wallets and their per-wallet transaction histories. Seeds three demo
 * wallets on construction — used both by the production {@code @Repository} bean and, as a
 * plain {@code new WalletRepository()}, by the isolated {@code /sim/*} sandbox in
 * {@code WalletService}, so a demo run always starts from the same three wallets the live API
 * does without ever touching live state.
 */
@Repository
public class WalletRepository {
    private final Map<Long, Wallet> wallets = new ConcurrentHashMap<>();
    private final Map<Long, List<Transaction>> transactions = new ConcurrentHashMap<>();
    private final AtomicLong walletIdGen = new AtomicLong(1);
    private final AtomicLong transactionIdGen = new AtomicLong(1);

    public WalletRepository() {
        saveWallet(Wallet.builder().id(walletIdGen.getAndIncrement()).userId("user1").userName("Alice")
                .balance(5000.0).currency("INR").createdAt(LocalDateTime.now()).build());
        saveWallet(Wallet.builder().id(walletIdGen.getAndIncrement()).userId("user2").userName("Bob")
                .balance(3000.0).currency("INR").createdAt(LocalDateTime.now()).build());
        saveWallet(Wallet.builder().id(walletIdGen.getAndIncrement()).userId("user3").userName("Charlie")
                .balance(10000.0).currency("INR").createdAt(LocalDateTime.now()).build());
    }

    public Wallet saveWallet(Wallet wallet) {
        wallets.put(wallet.getId(), wallet);
        return wallet;
    }

    public Wallet findWalletById(Long id) {
        return id == null ? null : wallets.get(id);
    }

    /** Sorted by id — the frontend (and several tests) rely on a stable, deterministic wallet order. */
    public List<Wallet> getAllWallets() {
        List<Wallet> all = new ArrayList<>(wallets.values());
        all.sort(Comparator.comparingLong(Wallet::getId));
        return all;
    }

    /** Sum of every wallet's balance — used to assert conservation across concurrent transfers. */
    public double totalBalance() {
        return wallets.values().stream().mapToDouble(Wallet::getBalance).sum();
    }

    public void addTransaction(Transaction txn) {
        Long primaryWalletId = txn.getWalletId() != null ? txn.getWalletId() : txn.getFromWalletId();
        transactions.computeIfAbsent(primaryWalletId, k -> Collections.synchronizedList(new ArrayList<>())).add(txn);
        if (txn.getToWalletId() != null && !txn.getToWalletId().equals(primaryWalletId)) {
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
