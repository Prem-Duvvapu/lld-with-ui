package com.lld.atm.service;

import com.lld.atm.controller.AtmController;
import com.lld.atm.dispenser.*;
import com.lld.atm.exception.InvalidSessionStateException;
import com.lld.atm.model.*;
import com.lld.atm.repository.BankingRepository;
import com.lld.config.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Field;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AtmSandboxSnapshotTest {
    private AtmService service;
    private BankingRepository live;

    @BeforeEach void setup() {
        var factory = new DenominationDispenseStrategyFactory(new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
        live = new BankingRepository();
        live.addAccount(Account.builder().id("live").accountNumber("LIVE").holderName("Live").balance(9000).build());
        service = new AtmService(live, new CashDispenser(factory), factory);
    }
    private void authenticate(String card, String pin) {
        service.simInsertCard(card); service.simAuthenticate(card, pin);
    }
    @SuppressWarnings("unchecked") private static <T> List<T> list(Map<String, Object> state, String name) { return (List<T>) state.get(name); }
    private static Account account(Map<String, Object> state, String number) {
        return AtmSandboxSnapshotTest.<Account>list(state, "accounts").stream().filter(a -> a.getAccountNumber().equals(number)).findFirst().orElseThrow();
    }

    @Test void capturedAccountsCardsAndEventsStayDetachedAcrossMutationAndReset() {
        authenticate("CARD-SIM-2", "5678");
        Map<String, Object> before = service.getSimSnapshots();
        Account active = (Account) before.get("activeAccount");
        Card card = (Card) before.get("activeCard");
        SimEvent event = AtmSandboxSnapshotTest.<SimEvent>list(before, "events").get(0);
        service.simWithdraw("ACC-SIM-2", 600, DispenseMode.MINIMIZE_NOTES);
        assertEquals(5000, active.getBalance());
        assertEquals(5000, account(before, "ACC-SIM-2").getBalance());
        assertEquals(3, list(before, "events").size());
        active.setBalance(-1); card.blockCard(); event.setDescription("changed by caller");
        account(before, "ACC-SIM-2").setBalance(-2);
        Map<String, Object> fresh = service.getSimSnapshots();
        assertEquals(4400, ((Account) fresh.get("activeAccount")).getBalance());
        assertFalse(((Card) fresh.get("activeCard")).isBlocked());
        assertNotEquals("changed by caller", service.getSimEvents().get(0).getDescription());
        service.simReset();
        assertEquals(4400, ((Account) fresh.get("activeAccount")).getBalance());
        assertEquals(9000, live.getAccount("LIVE").getBalance());
    }

    @Test void capturedPinAttemptsDoNotChangeWhenTheActualCardIsBlocked() {
        service.simInsertCard("CARD-SIM-1");
        Map<String, Object> before = service.getSimSnapshots();
        for (int i = 0; i < 3; i++) service.simAuthenticate("CARD-SIM-1", "9999");
        assertEquals(0, ((Card) before.get("activeCard")).getFailedPinAttempts());
        assertFalse(((Card) before.get("activeCard")).isBlocked());
        assertEquals(ATMState.CARD_BLOCKED, service.getSimSnapshots().get("simState"));
        assertEquals(3, ((Card) service.getSimSnapshots().get("activeCard")).getFailedPinAttempts());
    }

    @Test void authenticationRequiresTheInsertedCardAndInsertionCannotReplaceIt() {
        assertThrows(InvalidSessionStateException.class, () -> service.simAuthenticate("CARD-SIM-2", "5678"));
        service.simInsertCard("CARD-SIM-1");
        assertThrows(InvalidSessionStateException.class, () -> service.simInsertCard("CARD-SIM-2"));
        assertThrows(InvalidSessionStateException.class, () -> service.simAuthenticate("CARD-SIM-2", "5678"));
        assertEquals("CARD-SIM-1", ((Card) service.getSimSnapshots().get("activeCard")).getCardNumber());
    }

    @Test void withdrawalReturnsItsOwnOutcomeAndRejectsAnUnselectedAccount() {
        authenticate("CARD-SIM-1", "1234");
        Map<String, Object> rejected = service.simWithdraw("ACC-SIM-2", 600, DispenseMode.MINIMIZE_NOTES);
        assertEquals("REJECTED", rejected.get("withdrawalOutcome"));
        assertEquals(5000, account(rejected, "ACC-SIM-2").getBalance());
        assertEquals("SUCCESS", service.simWithdraw("ACC-SIM-1", 600, DispenseMode.MINIMIZE_NOTES).get("withdrawalOutcome"));
        assertEquals("INSUFFICIENT_BALANCE", service.simWithdraw("ACC-SIM-1", 600, DispenseMode.MINIMIZE_NOTES).get("withdrawalOutcome"));
        assertEquals(400, account(service.getSimSnapshots(), "ACC-SIM-1").getBalance());
    }

    @Test void tenRequestsAgainstBobHaveSevenApprovalsAndAnAuthoritativeFinalBalance() throws Exception {
        authenticate("CARD-SIM-2", "5678");
        service.simWithdraw("ACC-SIM-2", 300, DispenseMode.MINIMIZE_NOTES);
        var executor = Executors.newFixedThreadPool(10);
        var start = new CountDownLatch(1);
        try {
            List<Future<Map<String, Object>>> results = new ArrayList<>();
            for (int i = 0; i < 10; i++) results.add(executor.submit(() -> { start.await(); return service.simWithdraw("ACC-SIM-2", 600, DispenseMode.MINIMIZE_NOTES); }));
            start.countDown(); int approvals = 0;
            for (var future : results) if ("SUCCESS".equals(future.get(5, TimeUnit.SECONDS).get("withdrawalOutcome"))) approvals++;
            assertEquals(7, approvals);
            Map<String, Object> state = service.getSimSnapshots();
            assertEquals(500, ((Account) state.get("activeAccount")).getBalance());
            assertEquals(25500L, ((Number) state.get("dispenserCash")).longValue());
            assertEquals(8, service.getSimEvents().stream().filter(e -> e.getType().equals("WITHDRAW_SUCCESS")).count());
        } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    @Test void snapshotsCannotObserveTheDebitBeforeItsCassetteMutationCompletes() throws Exception {
        authenticate("CARD-SIM-2", "5678");
        Field field = AtmService.class.getDeclaredField("simCashDispenser"); field.setAccessible(true);
        CashDispenser cassette = (CashDispenser) field.get(service);
        AtomicReference<Map<String, Object>> captured = new AtomicReference<>();
        Thread mutation = new Thread(() -> service.simWithdraw("ACC-SIM-2", 600, DispenseMode.MINIMIZE_NOTES));
        Thread read = new Thread(() -> captured.set(service.getSimSnapshots()));
        cassette.getLock().lock();
        try {
            mutation.start(); awaitState(mutation, Thread.State.WAITING);
            read.start(); awaitState(read, Thread.State.BLOCKED);
            assertNull(captured.get(), "read must wait for the mutation's sandbox monitor");
        } finally { cassette.getLock().unlock(); mutation.join(5000); read.join(5000); }
        assertFalse(mutation.isAlive()); assertFalse(read.isAlive());
        assertEquals(4400, ((Account) captured.get().get("activeAccount")).getBalance());
        assertEquals(29400L, ((Number) captured.get().get("dispenserCash")).longValue());
        assertEquals(ATMState.AUTHENTICATED, captured.get().get("simState"));
    }

    @Test void resetResponseRemainsIdleAndDetachedAfterASubsequentInsertion() throws Exception {
        authenticate("CARD-SIM-2", "5678");
        Map<String, Object> reset = service.simReset();
        assertEquals(ATMState.IDLE, reset.get("simState")); assertNull(reset.get("activeCard"));
        assertNull(reset.get("activeAccount")); assertEquals(1, list(reset, "events").size());
        authenticate("CARD-SIM-1", "1234");
        assertEquals(ATMState.IDLE, reset.get("simState")); assertNull(reset.get("activeCard"));
        assertEquals(1, list(reset, "events").size());
    }

    @Test void stateAndLegacySnapshotEndpointsReturnEquivalentDetachedJsonAndOutcome() throws Exception {
        var http = MockMvcBuilders.standaloneSetup(new AtmController(service)).setControllerAdvice(new GlobalExceptionHandler()).build();
        String state = http.perform(get("/api/atm/sim/state")).andExpect(status().isOk()).andExpect(jsonPath("$.simState").value("IDLE")).andReturn().getResponse().getContentAsString();
        assertEquals(state, http.perform(get("/api/atm/sim/snapshots")).andReturn().getResponse().getContentAsString());
        authenticate("CARD-SIM-2", "5678");
        http.perform(post("/api/atm/sim/withdraw").contentType("application/json").content("{\"accountNumber\":\"ACC-SIM-2\",\"amount\":600}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.withdrawalOutcome").value("SUCCESS"));
        http.perform(post("/api/atm/sim/reset")).andExpect(status().isOk()).andExpect(jsonPath("$.simState").value("IDLE")).andExpect(jsonPath("$.events.length()").value(1));
    }

    private static void awaitState(Thread thread, Thread.State expected) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (thread.getState() != expected && System.nanoTime() < deadline) Thread.sleep(1);
        assertEquals(expected, thread.getState(), "worker did not reach the controlled blocking point");
    }
}
