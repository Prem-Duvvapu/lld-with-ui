package com.lld.atm.service;

import com.lld.atm.dispenser.CashDispenser;
import com.lld.atm.dispenser.ConserveLargeNotesDispenseStrategy;
import com.lld.atm.dispenser.DenominationDispenseStrategyFactory;
import com.lld.atm.dispenser.GreedyDenominationDispenseStrategy;
import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.exception.InvalidAtmRequestException;
import com.lld.atm.model.ATMState;
import com.lld.atm.model.Account;
import com.lld.atm.model.Card;
import com.lld.atm.model.NoteDenomination;
import com.lld.atm.model.Transaction;
import com.lld.atm.repository.BankingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Additional contract probes; no mocks, application server or changes to production code. */
class AtmOwnedSessionAdversarialTest {
    private static final String OWNER = "00000000-0000-4000-8000-000000000007";
    private BankingRepository bank;
    private CashDispenser cash;
    private AtmService atm;

    @BeforeEach void setUp() {
        bank = new BankingRepository();
        bank.addAccount(Account.builder().id("adversarial").accountNumber("A").holderName("Ada").balance(1000).build());
        bank.addCard(Card.builder().cardNumber("CARD-A").accountNumber("A").pin("1234").build());
        var factory = new DenominationDispenseStrategyFactory(
                new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
        cash = new CashDispenser(factory);
        atm = new AtmService(bank, cash, factory);
        run("insert", Map.of("cardNumber", "CARD-A"));
        run("authenticate", Map.of("cardNumber", "CARD-A", "pin", "1234"));
    }

    private Map<String, Object> body(String operation, Map<String, Object> payload) {
        Map<String, Object> state = atm.terminalState(OWNER);
        return Map.of("operation", operation, "bootId", state.get("bootId"),
                "expectedRevision", state.get("revision"), "payload", payload);
    }

    private Map<String, Object> run(String operation, Map<String, Object> payload) {
        return atm.terminalCommand(OWNER, UUID.randomUUID().toString(), body(operation, payload));
    }

    @Test void aPositiveFiniteDepositMustNotReportSuccessWithoutAnyCredit() {
        double before = bank.getAccount("A").getBalance();
        double tinyPositiveAmount = Math.scalb(1.0, -80);
        assertTrue(Double.isFinite(tinyPositiveAmount) && tinyPositiveAmount > 0);
        try {
            Map<String, Object> reply = run("deposit", Map.of("accountNumber", "A", "amount", tinyPositiveAmount));
            assertEquals("SUCCESS", ((Transaction) reply.get("result")).getStatus());
            assertTrue(bank.getAccount("A").getBalance() > before,
                    "An accepted deposit must actually credit the account; reject an unrepresentable increment before mutation");
        } catch (InvalidAtmRequestException explicitlyRejected) {
            assertEquals(before, bank.getAccount("A").getBalance());
            assertTrue(atm.getTransactions("A").isEmpty());
        }
        assertEquals(ATMState.AUTHENTICATED, atm.getCurrentState());
    }

    @Test void aLargeFiniteDepositMustNotEnableSuccessfulCashWithdrawalWithoutTheMatchingDebit() {
        // This balance is reachable using the public owned deposit contract, not repository mutation.
        double startingBalance = bank.getAccount("A").getBalance();
        long initialCash = cash.getTotalCashAvailable();
        try {
            run("deposit", Map.of("accountNumber", "A", "amount", Math.scalb(1.0, 64)));
        } catch (InvalidAtmRequestException explicitlyRejected) {
            // Rejecting the unsafe balance at deposit admission is an adequate bounded alternative.
            assertEquals(startingBalance, bank.getAccount("A").getBalance());
            assertEquals(initialCash, cash.getTotalCashAvailable());
            assertTrue(atm.getTransactions("A").isEmpty());
            return;
        }
        double before = bank.getAccount("A").getBalance();
        int transactionsBefore = atm.getTransactions("A").size();
        try {
            Map<String, Object> reply = run("withdraw", Map.of("accountNumber", "A", "amount", 500));
            Transaction receipt = (Transaction) reply.get("result");
            assertEquals("SUCCESS", receipt.getStatus());
            assertEquals(500.0, receipt.getAmount());
            assertEquals(initialCash - 500, cash.getTotalCashAvailable());
            assertEquals(500.0, before - bank.getAccount("A").getBalance(),
                    "Physical cash and the recorded successful debit must agree even at a large finite balance");
        } catch (InvalidAtmRequestException explicitlyRejected) {
            // The service may instead reject the debit before touching account/cassette state.
            assertEquals(before, bank.getAccount("A").getBalance());
            assertEquals(initialCash, cash.getTotalCashAvailable());
            assertEquals(transactionsBefore, atm.getTransactions("A").size());
        }
        assertEquals(ATMState.AUTHENTICATED, atm.getCurrentState());
    }

    @Test void aCachedCashFailureCannotTurnIntoSuccessAfterTheCassetteIsRefilled() {
        for (NoteDenomination denomination : NoteDenomination.values()) cash.setNoteCount(denomination, 0);
        String key = UUID.randomUUID().toString();
        Map<String, Object> command = body("withdraw", Map.of("accountNumber", "A", "amount", 500));
        assertThrows(InsufficientCashException.class, () -> atm.terminalCommand(OWNER, key, command));
        assertEquals(1000, bank.getAccount("A").getBalance());
        assertEquals(ATMState.AUTHENTICATED, atm.getCurrentState());
        assertEquals(1, atm.getTransactions("A").size());
        cash.addNotes(NoteDenomination.FIVE_HUNDRED, 1);
        long revision = ((Number) atm.terminalState(OWNER).get("revision")).longValue();
        assertThrows(InsufficientCashException.class, () -> atm.terminalCommand(OWNER, key, command));
        assertEquals(revision, ((Number) atm.terminalState(OWNER).get("revision")).longValue());
        assertEquals(1000, bank.getAccount("A").getBalance());
        assertEquals(500, cash.getTotalCashAvailable());
        assertEquals(1, atm.getTransactions("A").size());
        Map<?, ?> cached = (Map<?, ?>) atm.terminalOutcome(OWNER, key).get("outcome");
        assertEquals("InsufficientCashException", cached.get("code"));
        assertEquals(409, cached.get("httpStatus"));
        // A new request using a freshly observed revision can now succeed once.
        assertEquals("SUCCESS", ((Transaction) run("withdraw", Map.of("accountNumber", "A", "amount", 500)).get("result")).getStatus());
        assertEquals(500, bank.getAccount("A").getBalance());
        assertEquals(0, cash.getTotalCashAvailable());
    }

    @Test void reorderedNestedJsonMapsReplayTheSameJournalEntryRatherThanMovingMoneyAgain() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("accountNumber", "A"); payload.put("amount", 100.25);
        Map<String, Object> original = body("deposit", payload);
        String key = UUID.randomUUID().toString();
        Transaction first = (Transaction) atm.terminalCommand(OWNER, key, original).get("result");
        Map<String, Object> reordered = new LinkedHashMap<>();
        reordered.put("payload", Map.of("amount", 100.25, "accountNumber", "A"));
        reordered.put("expectedRevision", original.get("expectedRevision"));
        reordered.put("bootId", original.get("bootId"));
        reordered.put("operation", "deposit");
        Map<String, Object> replay = atm.terminalCommand(OWNER, key, reordered);
        assertEquals(true, replay.get("replayed"));
        assertEquals(first.getTransactionId(), ((Transaction) replay.get("result")).getTransactionId());
        assertEquals(1100.25, bank.getAccount("A").getBalance());
        assertEquals(1, atm.getTransactions("A").size());
    }
}
