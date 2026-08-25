package com.lld.digitalwallet.command;

import com.lld.digitalwallet.exception.InvalidAmountException;
import com.lld.digitalwallet.exception.WalletNotFoundException;
import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.repository.WalletRepository;

import java.time.LocalDateTime;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Adds funds to exactly one wallet. Holds only that wallet's own lock — a credit never touches
 * a second wallet, so no lock-ordering rule is needed here (unlike {@link TransferCommand}).
 */
public class CreditCommand implements WalletCommand {
    private final WalletRepository repository;
    private final ReentrantLock walletLock;
    private final long walletId;
    private final double amount;
    private final String paymentMethod;

    public CreditCommand(WalletRepository repository, ReentrantLock walletLock,
                          long walletId, double amount, String paymentMethod) {
        this.repository = repository;
        this.walletLock = walletLock;
        this.walletId = walletId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
    }

    @Override
    public Transaction execute() {
        if (amount <= 0) {
            throw new InvalidAmountException(amount);
        }
        walletLock.lock();
        try {
            Wallet wallet = repository.findWalletById(walletId);
            if (wallet == null) {
                throw new WalletNotFoundException(walletId);
            }
            wallet.setBalance(wallet.getBalance() + amount);

            Transaction txn = Transaction.builder()
                    .id(repository.nextTransactionId())
                    .walletId(walletId)
                    .toWalletId(walletId)
                    .amount(amount)
                    .type(Transaction.Type.CREDIT)
                    .status(Transaction.Status.COMPLETED)
                    .timestamp(LocalDateTime.now())
                    .description("Added via " + paymentMethod)
                    .build();
            repository.addTransaction(txn);
            return txn;
        } finally {
            walletLock.unlock();
        }
    }

    @Override
    public String describe() {
        return "CREDIT wallet " + walletId + " +" + amount + " via " + paymentMethod;
    }
}
