package com.lld.digitalwallet;

import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class WalletRepositoryTest {

    private WalletRepository repository;

    @BeforeEach
    void setUp() {
        repository = new WalletRepository();
    }

    @Test
    @DisplayName("Seeds 3 wallets (Alice/Bob/Charlie) on construction")
    void seedsDemoData() {
        List<Wallet> wallets = repository.getAllWallets();
        assertEquals(3, wallets.size());
        assertEquals(5000.0, repository.findWalletById(1L).getBalance());
        assertEquals(3000.0, repository.findWalletById(2L).getBalance());
        assertEquals(10000.0, repository.findWalletById(3L).getBalance());
        assertEquals("Alice", repository.findWalletById(1L).getUserName());
    }

    @Test
    @DisplayName("Wallet and transaction ids are generated atomically and never repeat")
    void idsAreAtomicAndUnique() {
        long w1 = repository.nextWalletId();
        long w2 = repository.nextWalletId();
        assertNotEquals(w1, w2);

        long t1 = repository.nextTransactionId();
        long t2 = repository.nextTransactionId();
        assertNotEquals(t1, t2);
    }

    @Test
    @DisplayName("saveWallet overwrites the stored wallet for that id")
    void saveWalletOverwrites() {
        Wallet original = repository.findWalletById(1L);
        assertNotNull(original);
        original.setBalance(999.0);
        repository.saveWallet(original);

        assertEquals(999.0, repository.findWalletById(1L).getBalance());
    }

    @Test
    @DisplayName("findWalletById returns null, not throw, for an unknown id")
    void findUnknownReturnsNull() {
        assertNull(repository.findWalletById(999L));
        assertNull(repository.findWalletById(null));
    }

    @Test
    @DisplayName("totalBalance sums every wallet's balance")
    void totalBalanceSums() {
        assertEquals(5000.0 + 3000.0 + 10000.0, repository.totalBalance(), 0.0001);
    }

    @Test
    @DisplayName("A CREDIT transaction (walletId only) is filed under one wallet")
    void creditFiledUnderOneWallet() {
        Transaction credit = Transaction.builder()
                .id(repository.nextTransactionId())
                .walletId(1L).toWalletId(1L)
                .amount(100.0).type(Transaction.Type.CREDIT).status(Transaction.Status.COMPLETED)
                .timestamp(LocalDateTime.now()).description("test credit").build();
        repository.addTransaction(credit);

        assertEquals(1, repository.getTransactionsByWalletId(1L).size());
        assertTrue(repository.getTransactionsByWalletId(2L).isEmpty());
    }

    @Test
    @DisplayName("A TRANSFER is filed under both sender and recipient")
    void transferFiledUnderBothWallets() {
        Transaction transfer = Transaction.builder()
                .id(repository.nextTransactionId())
                .walletId(1L).fromWalletId(1L).toWalletId(2L)
                .amount(50.0).type(Transaction.Type.TRANSFER).status(Transaction.Status.COMPLETED)
                .timestamp(LocalDateTime.now()).description("test transfer").build();
        repository.addTransaction(transfer);

        assertEquals(1, repository.getTransactionsByWalletId(1L).size());
        assertEquals(1, repository.getTransactionsByWalletId(2L).size());
    }

    @Test
    @DisplayName("getTransactionsByWalletId returns empty, not null, for an untouched wallet")
    void transactionsForUntouchedWalletIsEmpty() {
        assertTrue(repository.getTransactionsByWalletId(999L).isEmpty());
    }
}
