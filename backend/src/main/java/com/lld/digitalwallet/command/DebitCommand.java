package com.lld.digitalwallet.command;

import com.lld.digitalwallet.exception.InsufficientBalanceException;
import com.lld.digitalwallet.exception.InvalidAmountException;
import com.lld.digitalwallet.exception.WalletNotFoundException;
import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.repository.WalletRepository;

import java.time.LocalDateTime;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Withdraws funds from exactly one wallet. Like {@link CreditCommand}, only one wallet's lock
 * is ever held, so there is no ordering concern — the balance check-then-act race is closed by
 * re-reading the balance under the lock rather than trusting a value read before locking.
 */
public class DebitCommand implements WalletCommand {
    private final WalletRepository repository;
    private final ReentrantLock walletLock;
    private final long walletId;
    private final double amount;
    private final String description;

    public DebitCommand(WalletRepository repository, ReentrantLock walletLock,
                         long walletId, double amount, String description) {
        this.repository = repository;
        this.walletLock = walletLock;
        this.walletId = walletId;
        this.amount = amount;
        this.description = description;
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
            if (wallet.getBalance() < amount) {
                throw new InsufficientBalanceException(walletId, amount, wallet.getBalance());
            }
            wallet.setBalance(wallet.getBalance() - amount);

            Transaction txn = Transaction.builder()
                    .id(repository.nextTransactionId())
                    .walletId(walletId)
                    .fromWalletId(walletId)
                    .amount(amount)
                    .type(Transaction.Type.DEBIT)
                    .status(Transaction.Status.COMPLETED)
                    .timestamp(LocalDateTime.now())
                    .description(description != null && !description.isBlank() ? description : "Withdrawal")
                    .build();
            repository.addTransaction(txn);
            return txn;
        } finally {
            walletLock.unlock();
        }
    }

    @Override
    public String describe() {
        return "DEBIT wallet " + walletId + " -" + amount;
    }
}
