package com.lld.digitalwallet;

import com.lld.digitalwallet.exception.InsufficientBalanceException;
import com.lld.digitalwallet.exception.InvalidAmountException;
import com.lld.digitalwallet.exception.SelfTransferException;
import com.lld.digitalwallet.exception.WalletNotFoundException;
import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.repository.WalletRepository;
import com.lld.digitalwallet.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class WalletServiceTest {

    private WalletService service;

    @BeforeEach
    void setUp() {
        service = new WalletService(new WalletRepository());
    }

    @Test
    @DisplayName("createWallet starts a new wallet at zero balance")
    void createWalletStartsAtZero() {
        Wallet wallet = service.createWallet("newuser", "Dana");
        assertEquals(0.0, wallet.getBalance());
        assertEquals("newuser", wallet.getUserId());
        assertEquals("INR", wallet.getCurrency());
        assertNotNull(wallet.getCreatedAt());
    }

    @Test
    @DisplayName("getBalance on an unknown wallet throws WalletNotFoundException")
    void getBalanceUnknownWallet() {
        assertThrows(WalletNotFoundException.class, () -> service.getBalance(999));
    }

    @Test
    @DisplayName("addFunds credits the wallet and returns the new balance")
    void addFundsCreditsWallet() {
        Map<String, Object> result = service.addFunds(1, 1000.0, "UPI");
        assertEquals(true, result.get("success"));
        assertEquals(6000.0, (Double) result.get("newBalance"), 0.0001);
        assertEquals(6000.0, service.getBalance(1));
    }

    @Test
    @DisplayName("addFunds rejects a non-positive amount")
    void addFundsRejectsInvalidAmount() {
        assertThrows(InvalidAmountException.class, () -> service.addFunds(1, -1.0, "CARD"));
    }

    @Test
    @DisplayName("withdrawFunds debits the wallet")
    void withdrawFundsDebitsWallet() {
        Map<String, Object> result = service.withdrawFunds(1, 1000.0, "ATM");
        assertEquals(4000.0, (Double) result.get("newBalance"), 0.0001);
    }

    @Test
    @DisplayName("withdrawFunds rejects insufficient balance")
    void withdrawFundsRejectsInsufficientBalance() {
        assertThrows(InsufficientBalanceException.class, () -> service.withdrawFunds(1, 999999.0, "too much"));
    }

    @Test
    @DisplayName("sendMoney transfers between two wallets and both balances reflect it")
    void sendMoneyTransfers() {
        Map<String, Object> result = service.sendMoney(1, 2, 500.0, "lunch");
        assertEquals(4500.0, (Double) result.get("fromBalance"), 0.0001);
        assertEquals(3500.0, (Double) result.get("toBalance"), 0.0001);
    }

    @Test
    @DisplayName("sendMoney rejects a transfer to the same wallet")
    void sendMoneyRejectsSelfTransfer() {
        assertThrows(SelfTransferException.class, () -> service.sendMoney(1, 1, 10.0, "x"));
    }

    @Test
    @DisplayName("sendMoney rejects an unknown recipient")
    void sendMoneyRejectsUnknownRecipient() {
        assertThrows(WalletNotFoundException.class, () -> service.sendMoney(1, 999, 10.0, "x"));
    }

    @Test
    @DisplayName("getTransactions returns the wallet's full history in order")
    void getTransactionsReturnsHistory() {
        service.addFunds(1, 100.0, "CARD");
        service.sendMoney(1, 2, 50.0, "split");
        List<Transaction> history = service.getTransactions(1);
        assertEquals(2, history.size());
        assertEquals(Transaction.Type.CREDIT, history.get(0).getType());
        assertEquals(Transaction.Type.TRANSFER, history.get(1).getType());
    }

    @Test
    @DisplayName("getTransactions on an unknown wallet throws WalletNotFoundException")
    void getTransactionsUnknownWallet() {
        assertThrows(WalletNotFoundException.class, () -> service.getTransactions(999));
    }

    @Test
    @DisplayName("The command log records every executed command, in order")
    void commandLogRecordsHistory() {
        service.addFunds(1, 10.0, "CARD");
        service.withdrawFunds(1, 5.0, "atm");
        service.sendMoney(1, 2, 5.0, "split");

        List<String> log = service.getCommandLog();
        assertEquals(3, log.size());
        assertTrue(log.get(0).startsWith("CREDIT"));
        assertTrue(log.get(1).startsWith("DEBIT"));
        assertTrue(log.get(2).startsWith("TRANSFER"));
    }

    @Test
    @DisplayName("A rejected command is never appended to the command log")
    void rejectedCommandNotLogged() {
        assertThrows(InvalidAmountException.class, () -> service.addFunds(1, -1.0, "CARD"));
        assertTrue(service.getCommandLog().isEmpty());
    }

    // --------------------------------------------------------------- sim engine

    @Test
    @DisplayName("simReset re-seeds the sandbox to the same 3 wallets as live, independently")
    void simResetSeedsSandbox() {
        Map<String, Object> snapshot = service.simReset();
        @SuppressWarnings("unchecked")
        List<Wallet> wallets = (List<Wallet>) snapshot.get("wallets");
        assertEquals(3, wallets.size());
        assertEquals(18000.0, (Double) snapshot.get("totalBalance"), 0.0001);
    }

    @Test
    @DisplayName("Sim mutations never affect the live wallets")
    void simMutationsIsolatedFromLive() {
        service.simReset();
        service.simCredit(1, 99999.0, "CARD", 3);

        assertEquals(5000.0, service.getBalance(1), "live wallet 1 must be untouched by a sim credit");
    }

    @Test
    @DisplayName("simTransfer moves funds within the sandbox only")
    void simTransferMovesFundsInSandbox() {
        service.simReset();
        service.simTransfer(1, 2, 500.0, "sim transfer", 6);

        Map<String, Object> snapshot = service.getSimSnapshot();
        assertEquals(18000.0, (Double) snapshot.get("totalBalance"), 0.0001);
        assertEquals(5000.0, service.getBalance(1), "live wallet must be untouched");
    }

    @Test
    @DisplayName("simRace fires concurrent transfers and conserves the total sandbox balance")
    void simRaceConservesTotal() {
        service.simReset();
        Map<String, Object> result = service.simRace(1, 2, 20, 10.0, 8);

        assertEquals(true, result.get("conserved"));
        assertEquals((Double) result.get("totalBefore"), (Double) result.get("totalAfter"), 0.0001);
    }

    @Test
    @DisplayName("simGetEvents accumulates one event per sim step")
    void simEventsAccumulate() {
        service.simReset();
        service.simCredit(1, 10.0, "CARD", 3);
        service.simDebit(1, 5.0, 4);

        assertTrue(service.simGetEvents().size() >= 3); // reset + credit + debit
    }
}
