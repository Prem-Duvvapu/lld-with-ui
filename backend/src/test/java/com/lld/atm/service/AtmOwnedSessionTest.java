package com.lld.atm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.atm.controller.AtmController;
import com.lld.atm.dispenser.*;
import com.lld.atm.exception.*;
import com.lld.atm.model.*;
import com.lld.atm.repository.BankingRepository;
import com.lld.config.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AtmOwnedSessionTest {
    private static final String A = "00000000-0000-4000-8000-000000000001";
    private static final String B = "00000000-0000-4000-8000-000000000002";
    private final MutableClock clock = new MutableClock();
    private final BankingRepository bank = new BankingRepository();
    private final DenominationDispenseStrategyFactory factory = new DenominationDispenseStrategyFactory(
            new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
    private CashDispenser cash;
    private AtmService atm;
    private MockMvc http;
    private final ObjectMapper json = new ObjectMapper();
    @BeforeEach void setUp() {
        bank.addAccount(Account.builder().id("a").accountNumber("A").holderName("Alice").balance(1000).build());
        bank.addAccount(Account.builder().id("b").accountNumber("B").holderName("Bob").balance(2000).build());
        bank.addCard(Card.builder().cardNumber("CARD-A").pin("1234").accountNumber("A").build());
        bank.addCard(Card.builder().cardNumber("CARD-B").pin("4321").accountNumber("B").build());
        cash = new CashDispenser(factory); atm = new AtmService(bank, cash, factory, clock);
        http = MockMvcBuilders.standaloneSetup(new AtmController(atm)).setControllerAdvice(new GlobalExceptionHandler()).build();
    }
    private String id() { return UUID.randomUUID().toString(); }
    private Map<String, Object> body(String owner, String op, Map<String, Object> payload) {
        Map<String, Object> state = atm.terminalState(owner);
        return Map.of("operation", op, "expectedRevision", state.get("revision"), "bootId", state.get("bootId"), "payload", payload);
    }
    private Map<String, Object> run(String owner, String op, Map<String, Object> payload) {
        return atm.terminalCommand(owner, id(), body(owner, op, payload));
    }
    private void login() { run(A, "insert", Map.of("cardNumber", "CARD-A")); run(A, "authenticate", Map.of("cardNumber", "CARD-A", "pin", "1234")); }

    @Test void aSecondBrowserSeesOnlyBusyStateAndCannotEjectOrOperateTheOwnedSession() {
        login(); Map<String, Object> foreign = atm.terminalState(B);
        assertEquals("BUSY", foreign.get("state")); assertEquals(false, foreign.get("owned"));
        assertNull(foreign.get("account")); assertNull(foreign.get("cardNumber")); assertEquals(List.of(), foreign.get("transactions"));
        assertThrows(AtmSessionConflictException.class, () -> run(B, "eject", Map.of()));
        assertThrows(AtmSessionConflictException.class, () -> run(B, "withdraw", Map.of("accountNumber", "A", "amount", 100)));
        assertThrows(AtmSessionConflictException.class, () -> run(B, "insert", Map.of("cardNumber", "CARD-B")));
        assertThrows(AtmSessionConflictException.class, atm::ejectCard);
        assertThrows(AtmSessionConflictException.class, () -> atm.withdraw("A", 100));
        assertThrows(AtmSessionConflictException.class, () -> atm.deposit("A", 100, null));
        assertThrows(AtmSessionConflictException.class, () -> atm.authenticate("CARD-A", "1234"));
        assertThrows(AtmSessionConflictException.class, () -> atm.getBalance("A"));
        assertEquals(1000, bank.getAccount("A").getBalance());
    }
    @Test void moneyReplayReturnsOneReceiptAndDoesNotDebitOrDispenseAgain() {
        login(); String request = id(); Map<String, Object> command = body(A, "withdraw", Map.of("accountNumber", "A", "amount", 500));
        long beforeCash = cash.getTotalCashAvailable();
        Map<String, Object> first = atm.terminalCommand(A, request, command);
        WithdrawalTransaction original = (WithdrawalTransaction) first.get("result");
        long timestamp = original.getTimestampEpoch(); String transactionId = original.getTransactionId();
        original.setStatus("changed"); original.getDispensedNotes().clear();
        Map<String, Object> retry = atm.terminalCommand(A, request, command);
        WithdrawalTransaction receipt = (WithdrawalTransaction) retry.get("result");
        assertEquals(true, retry.get("replayed")); assertEquals(transactionId, receipt.getTransactionId());
        assertEquals(timestamp, receipt.getTimestampEpoch()); assertEquals("SUCCESS", receipt.getStatus());
        assertEquals(Map.of(NoteDenomination.FIVE_HUNDRED, 1), receipt.getDispensedNotes());
        assertEquals(500, bank.getAccount("A").getBalance()); assertEquals(beforeCash - 500, cash.getTotalCashAvailable());
        assertEquals(1, atm.getTransactions("A").size());
        Map<String, Object> changed = new LinkedHashMap<>(command); changed.put("payload", Map.of("accountNumber", "A", "amount", 100));
        assertThrows(AtmSessionConflictException.class, () -> atm.terminalCommand(A, request, changed));
        assertEquals("NOT_FOUND", atm.terminalOutcome(B, request).get("status"));
        assertEquals("FOUND", atm.terminalOutcome(A, request).get("status"));
    }
    @Test void readOnlyRecoveryOfAnUnknownRequestDoesNotRunIt() {
        login(); String request = id(); long beforeCash = cash.getTotalCashAvailable();
        for (int i = 0; i < 3; i++) assertEquals("NOT_FOUND", atm.terminalOutcome(A, request).get("status"));
        assertEquals(1000, bank.getAccount("A").getBalance()); assertEquals(beforeCash, cash.getTotalCashAvailable());
        assertTrue(atm.getTransactions("A").isEmpty());
    }
    @Test void replayingARejectedPinDoesNotConsumeAnotherAttemptOrChangeThePhase() {
        run(A, "insert", Map.of("cardNumber", "CARD-A"));
        String request = id(); Map<String, Object> wrong = body(A, "authenticate", Map.of("cardNumber", "CARD-A", "pin", "9999"));
        assertThrows(AuthenticationFailedException.class, () -> atm.terminalCommand(A, request, wrong));
        assertThrows(AuthenticationFailedException.class, () -> atm.terminalCommand(A, request, wrong));
        assertEquals(1, bank.getCard("CARD-A").getFailedPinAttempts());
        Map<?, ?> detail = (Map<?, ?>) atm.terminalOutcome(A, request).get("outcome");
        assertEquals(401, detail.get("httpStatus")); assertEquals("AuthenticationFailedException", detail.get("code"));
        assertEquals(2, atm.terminalState(A).get("pinAttemptsRemaining"));
        run(A, "authenticate", Map.of("cardNumber", "CARD-A", "pin", "1234"));
        assertThrows(AuthenticationFailedException.class, () -> atm.terminalCommand(A, request, wrong));
        assertEquals(ATMState.AUTHENTICATED, atm.getCurrentState());
        assertEquals(0, bank.getCard("CARD-A").getFailedPinAttempts());
    }
    @Test void simultaneousDifferentRequestsFromTheSameRevisionCannotBothMoveMoney() throws Exception {
        login(); Map<String, Object> command = body(A, "withdraw", Map.of("accountNumber", "A", "amount", 500));
        ExecutorService workers = Executors.newFixedThreadPool(2); CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> calls = new ArrayList<>();
            for (int i = 0; i < 2; i++) calls.add(workers.submit(() -> { start.await(); try { atm.terminalCommand(A, id(), command); return true; } catch (AtmSessionConflictException expected) { return false; } }));
            start.countDown(); int successes = 0; for (Future<Boolean> call : calls) if (call.get(5, TimeUnit.SECONDS)) successes++;
            assertEquals(1, successes); assertEquals(500, bank.getAccount("A").getBalance()); assertEquals(1, atm.getTransactions("A").size());
        } finally { workers.shutdownNow(); assertTrue(workers.awaitTermination(5, TimeUnit.SECONDS)); }
    }
    @Test void simultaneousRetriesOfOneRequestReturnTheSameSingleTransaction() throws Exception {
        login(); Map<String, Object> command = body(A, "withdraw", Map.of("accountNumber", "A", "amount", 500)); String request = id();
        ExecutorService workers = Executors.newFixedThreadPool(8); CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<String>> calls = new ArrayList<>();
            for (int i = 0; i < 8; i++) calls.add(workers.submit(() -> { start.await(); return ((Transaction) atm.terminalCommand(A, request, command).get("result")).getTransactionId(); }));
            start.countDown(); Set<String> ids = new HashSet<>(); for (Future<String> call : calls) ids.add(call.get(5, TimeUnit.SECONDS));
            assertEquals(1, ids.size()); assertEquals(500, bank.getAccount("A").getBalance()); assertEquals(1, atm.getTransactions("A").size());
        } finally { workers.shutdownNow(); assertTrue(workers.awaitTermination(5, TimeUnit.SECONDS)); }
    }
    @Test void expiryReleasesTheSlotWithoutChangingMoneyAndOldRequestsCannotAffectItsNextOwner() {
        login(); String oldId = id(); Map<String, Object> old = body(A, "withdraw", Map.of("accountNumber", "A", "amount", 500));
        clock.advance(AtmLiveSessionCoordinator.LEASE_MILLIS - 1);
        assertEquals("AUTHENTICATED", atm.terminalState(A).get("state")); // Reading does not renew.
        clock.advance(1); assertEquals("IDLE", atm.terminalState(B).get("state"));
        assertEquals(1000, bank.getAccount("A").getBalance());
        run(B, "insert", Map.of("cardNumber", "CARD-B")); run(B, "authenticate", Map.of("cardNumber", "CARD-B", "pin", "4321"));
        assertThrows(AtmSessionConflictException.class, () -> atm.terminalCommand(A, oldId, old));
        assertEquals(2000, bank.getAccount("B").getBalance()); assertEquals("BUSY", atm.terminalState(A).get("state"));
    }
    @Test void aPriorProcessCommandIsRejectedEvenIfTheNewRevisionCoincides() {
        Map<String, Object> old = body(A, "insert", Map.of("cardNumber", "CARD-A"));
        AtmService restarted = new AtmService(bank, cash, factory, clock);
        assertThrows(AtmSessionConflictException.class, () -> restarted.terminalCommand(A, id(), old));
        assertEquals(ATMState.IDLE, restarted.getCurrentState());
    }
    @Test void evictionCannotTurnAnOldCommandIntoAnotherWithdrawal() {
        login(); String request = id(); Map<String, Object> old = body(A, "withdraw", Map.of("accountNumber", "A", "amount", 500));
        atm.terminalCommand(A, request, old);
        for (int i = 0; i < AtmLiveSessionCoordinator.MAX_OUTCOMES / 2 + 2; i++) { run(A, "eject", Map.of()); run(A, "insert", Map.of("cardNumber", "CARD-A")); }
        assertEquals("NOT_FOUND", atm.terminalOutcome(A, request).get("status"));
        assertThrows(AtmSessionConflictException.class, () -> atm.terminalCommand(A, request, old));
        assertEquals(500, bank.getAccount("A").getBalance()); assertEquals(1, atm.getTransactions("A").size());
    }
    @Test void ownedSnapshotsAreDetachedAndNeverSerializeTheStoredPin() throws Exception {
        login(); Map<String, Object> state = atm.terminalState(A); ((Account) state.get("account")).setBalance(1);
        assertEquals(1000, bank.getAccount("A").getBalance());
        assertFalse(json.writeValueAsString(state).contains("\"pin\""));
        assertEquals("NOT_FOUND", atm.terminalOutcome(A, id()).get("status"));
    }
    @Test void realHttpUsesTypedErrorsAndReplaysTheSameReceipt() throws Exception {
        http.perform(get("/api/atm/terminal/state")).andExpect(header().string("Cache-Control", "no-store")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("InvalidAtmRequestException"));
        login(); String request = id(); String body = json.writeValueAsString(body(A, "withdraw", Map.of("accountNumber", "A", "amount", 500)));
        for (int i = 0; i < 2; i++) http.perform(post("/api/atm/terminal/commands").header("X-ATM-Session", A).header("Idempotency-Key", request).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.amount").value(500)).andExpect(jsonPath("$.snapshot.account.balance").value(500));
        http.perform(get("/api/atm/terminal/requests/" + request).header("X-ATM-Session", A)).andExpect(status().isOk()).andExpect(jsonPath("$.outcome.httpStatus").value(200));
        http.perform(post("/api/atm/eject")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("AtmSessionConflictException"));
        assertEquals(1, atm.getTransactions("A").size());
    }
    @Test void unexpectedFailureAfterRealDispensingRemainsUncertainAndCannotBeReplayedAsANewDebit() {
        CashDispenser faulty = new CashDispenser(factory) {
            @Override public Map<NoteDenomination, Integer> dispenseCash(int amount, DispenseMode mode) {
                super.dispenseCash(amount, mode);
                throw new IllegalStateException("Injected failure after actual note deduction");
            }
        };
        atm = new AtmService(bank, faulty, factory, clock); login();
        Map<String, Object> command = body(A, "withdraw", Map.of("accountNumber", "A", "amount", 500));
        String request = id(); long beforeCash = faulty.getTotalCashAvailable();
        assertThrows(AtmOperationUncertainException.class, () -> atm.terminalCommand(A, request, command));
        assertEquals(ATMState.AUTHENTICATED, atm.getCurrentState());
        assertEquals(500, bank.getAccount("A").getBalance()); assertEquals(beforeCash - 500, faulty.getTotalCashAvailable());
        Map<?, ?> outcome = (Map<?, ?>) atm.terminalOutcome(A, request).get("outcome");
        assertEquals(500, outcome.get("httpStatus")); assertEquals("AtmOperationUncertainException", outcome.get("code"));
        assertThrows(AtmOperationUncertainException.class, () -> atm.terminalCommand(A, request, command));
        assertEquals(500, bank.getAccount("A").getBalance()); assertEquals(beforeCash - 500, faulty.getTotalCashAvailable());
    }

    private static final class MutableClock extends Clock {
        private final AtomicLong now = new AtomicLong(1_000_000);
        void advance(long millis) { now.addAndGet(millis); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return Instant.ofEpochMilli(now.get()); }
        @Override public long millis() { return now.get(); }
    }
}
