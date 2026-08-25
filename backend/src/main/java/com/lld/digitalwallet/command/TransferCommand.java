package com.lld.digitalwallet.command;

import com.lld.digitalwallet.exception.InsufficientBalanceException;
import com.lld.digitalwallet.exception.InvalidAmountException;
import com.lld.digitalwallet.exception.SelfTransferException;
import com.lld.digitalwallet.exception.WalletNotFoundException;
import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.repository.WalletRepository;

import java.time.LocalDateTime;
import java.util.function.LongFunction;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Moves funds between two wallets atomically.
 *
 * <p><b>Deadlock-free two-account locking:</b> two concurrent transfers that name the same pair
 * of wallets in opposite directions (A→B and B→A) must never deadlock by each holding one side's
 * lock and waiting on the other. This command avoids that by never locking "from" then "to" — it
 * always locks the two wallet ids in <i>ascending numeric order</i>, regardless of which one is
 * the sender: {@code lock(min(fromId, toId))} first, then {@code lock(max(fromId, toId))}. Every
 * transfer in the system therefore acquires locks in the same global order, so a cycle of waiters
 * (the precondition for deadlock) can never form. Locks are released in the reverse order they
 * were taken.
 */
public class TransferCommand implements WalletCommand {
    private final WalletRepository repository;
    private final LongFunction<ReentrantLock> lockProvider;
    private final long fromWalletId;
    private final long toWalletId;
    private final double amount;
    private final String description;

    public TransferCommand(WalletRepository repository, LongFunction<ReentrantLock> lockProvider,
                            long fromWalletId, long toWalletId, double amount, String description) {
        this.repository = repository;
        this.lockProvider = lockProvider;
        this.fromWalletId = fromWalletId;
        this.toWalletId = toWalletId;
        this.amount = amount;
        this.description = description;
    }

    @Override
    public Transaction execute() {
        if (fromWalletId == toWalletId) {
            throw new SelfTransferException(fromWalletId);
        }
        if (amount <= 0) {
            throw new InvalidAmountException(amount);
        }

        long firstId = Math.min(fromWalletId, toWalletId);
        long secondId = Math.max(fromWalletId, toWalletId);
        ReentrantLock firstLock = lockProvider.apply(firstId);
        ReentrantLock secondLock = lockProvider.apply(secondId);

        firstLock.lock();
        try {
            secondLock.lock();
            try {
                Wallet from = repository.findWalletById(fromWalletId);
                Wallet to = repository.findWalletById(toWalletId);
                if (from == null) {
                    throw new WalletNotFoundException(fromWalletId);
                }
                if (to == null) {
                    throw new WalletNotFoundException(toWalletId);
                }
                if (from.getBalance() < amount) {
                    throw new InsufficientBalanceException(fromWalletId, amount, from.getBalance());
                }

                from.setBalance(from.getBalance() - amount);
                to.setBalance(to.getBalance() + amount);

                Transaction txn = Transaction.builder()
                        .id(repository.nextTransactionId())
                        .walletId(fromWalletId)
                        .fromWalletId(fromWalletId)
                        .toWalletId(toWalletId)
                        .amount(amount)
                        .type(Transaction.Type.TRANSFER)
                        .status(Transaction.Status.COMPLETED)
                        .timestamp(LocalDateTime.now())
                        .description(description != null && !description.isBlank() ? description : "Transfer")
                        .build();
                repository.addTransaction(txn);
                return txn;
            } finally {
                secondLock.unlock();
            }
        } finally {
            firstLock.unlock();
        }
    }

    @Override
    public String describe() {
        return "TRANSFER " + amount + " from wallet " + fromWalletId + " to wallet " + toWalletId;
    }
}
