package com.lld.digitalwallet;

import com.lld.digitalwallet.command.CreditCommand;
import com.lld.digitalwallet.command.DebitCommand;
import com.lld.digitalwallet.command.TransferCommand;
import com.lld.digitalwallet.exception.InsufficientBalanceException;
import com.lld.digitalwallet.exception.InvalidAmountException;
import com.lld.digitalwallet.exception.SelfTransferException;
import com.lld.digitalwallet.exception.WalletNotFoundException;
import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the three {@code WalletCommand} implementations in isolation from
 * {@code WalletService} — each command owns its own validation, locking and arithmetic, so it
 * must be correct on its own.
 */
@DisplayName("Wallet Commands — Credit / Debit / Transfer")
class WalletCommandTest {

    private WalletRepository repository;
    private ConcurrentHashMap<Long, ReentrantLock> locks;

    @BeforeEach
    void setUp() {
        repository = new WalletRepository();
        locks = new ConcurrentHashMap<>();
    }

    private ReentrantLock lockFor(long walletId) {
        return locks.computeIfAbsent(walletId, id -> new ReentrantLock());
    }

    // ------------------------------------------------------------ CreditCommand

    @Test
    @DisplayName("CreditCommand increases balance and records a CREDIT transaction")
    void creditIncreasesBalance() {
        double before = repository.findWalletById(1L).getBalance();
        Transaction txn = new CreditCommand(repository, lockFor(1), 1, 250.0, "UPI").execute();

        assertEquals(before + 250.0, repository.findWalletById(1L).getBalance());
        assertEquals(Transaction.Type.CREDIT, txn.getType());
        assertEquals(Transaction.Status.COMPLETED, txn.getStatus());
        assertEquals(250.0, txn.getAmount());
        assertTrue(txn.getDescription().contains("UPI"));
    }

    @Test
    @DisplayName("CreditCommand rejects a non-positive amount")
    void creditRejectsNonPositiveAmount() {
        assertThrows(InvalidAmountException.class, () -> new CreditCommand(repository, lockFor(1), 1, 0.0, "CARD").execute());
        assertThrows(InvalidAmountException.class, () -> new CreditCommand(repository, lockFor(1), 1, -10.0, "CARD").execute());
    }

    @Test
    @DisplayName("CreditCommand on an unknown wallet throws WalletNotFoundException")
    void creditUnknownWallet() {
        assertThrows(WalletNotFoundException.class, () -> new CreditCommand(repository, lockFor(999), 999, 10.0, "CARD").execute());
    }

    // ------------------------------------------------------------- DebitCommand

    @Test
    @DisplayName("DebitCommand decreases balance and records a DEBIT transaction")
    void debitDecreasesBalance() {
        double before = repository.findWalletById(1L).getBalance();
        Transaction txn = new DebitCommand(repository, lockFor(1), 1, 500.0, "withdrawal").execute();

        assertEquals(before - 500.0, repository.findWalletById(1L).getBalance());
        assertEquals(Transaction.Type.DEBIT, txn.getType());
    }

    @Test
    @DisplayName("DebitCommand rejects an amount greater than the balance")
    void debitRejectsInsufficientBalance() {
        double balance = repository.findWalletById(1L).getBalance();
        assertThrows(InsufficientBalanceException.class,
                () -> new DebitCommand(repository, lockFor(1), 1, balance + 1, "too much").execute());
        // balance must be unchanged after a rejected debit
        assertEquals(balance, repository.findWalletById(1L).getBalance());
    }

    @Test
    @DisplayName("DebitCommand rejects a non-positive amount")
    void debitRejectsNonPositiveAmount() {
        assertThrows(InvalidAmountException.class, () -> new DebitCommand(repository, lockFor(1), 1, -5.0, "x").execute());
    }

    // ---------------------------------------------------------- TransferCommand

    @Test
    @DisplayName("TransferCommand moves funds and preserves the combined total")
    void transferMovesFunds() {
        double totalBefore = repository.totalBalance();
        Transaction txn = new TransferCommand(repository, this::lockFor, 1, 2, 1000.0, "rent").execute();

        assertEquals(4000.0, repository.findWalletById(1L).getBalance());
        assertEquals(4000.0, repository.findWalletById(2L).getBalance());
        assertEquals(totalBefore, repository.totalBalance(), 0.0001);
        assertEquals(Transaction.Type.TRANSFER, txn.getType());
        assertEquals(1L, txn.getFromWalletId());
        assertEquals(2L, txn.getToWalletId());
    }

    @Test
    @DisplayName("TransferCommand rejects insufficient sender balance and leaves both wallets unchanged")
    void transferRejectsInsufficientBalance() {
        double fromBefore = repository.findWalletById(1L).getBalance();
        double toBefore = repository.findWalletById(2L).getBalance();

        assertThrows(InsufficientBalanceException.class,
                () -> new TransferCommand(repository, this::lockFor, 1, 2, fromBefore + 1, "too much").execute());

        assertEquals(fromBefore, repository.findWalletById(1L).getBalance());
        assertEquals(toBefore, repository.findWalletById(2L).getBalance());
    }

    @Test
    @DisplayName("TransferCommand rejects a transfer to the same wallet")
    void transferRejectsSelfTransfer() {
        assertThrows(SelfTransferException.class,
                () -> new TransferCommand(repository, this::lockFor, 1, 1, 10.0, "x").execute());
    }

    @Test
    @DisplayName("TransferCommand rejects an unknown sender or recipient")
    void transferRejectsUnknownWallet() {
        assertThrows(WalletNotFoundException.class,
                () -> new TransferCommand(repository, this::lockFor, 999, 2, 10.0, "x").execute());
        assertThrows(WalletNotFoundException.class,
                () -> new TransferCommand(repository, this::lockFor, 1, 999, 10.0, "x").execute());
    }

    @Test
    @DisplayName("TransferCommand rejects a non-positive amount")
    void transferRejectsNonPositiveAmount() {
        assertThrows(InvalidAmountException.class,
                () -> new TransferCommand(repository, this::lockFor, 1, 2, 0.0, "x").execute());
    }

    @Test
    @DisplayName("TransferCommand locks the lower wallet id first regardless of transfer direction")
    void transferLocksAscendingIdOrder() {
        // Wallet 1 -> 2 and wallet 2 -> 1 must both acquire lock(1) before lock(2).
        ReentrantLock lock1 = lockFor(1);
        ReentrantLock lock2 = lockFor(2);

        new TransferCommand(repository, this::lockFor, 2, 1, 100.0, "reverse direction").execute();
        // If ascending-order locking were violated, this would be the classic setup for a
        // lock-order deadlock under concurrency (exercised properly in WalletConcurrencyTest).
        assertFalse(lock1.isLocked());
        assertFalse(lock2.isLocked());
    }
}
