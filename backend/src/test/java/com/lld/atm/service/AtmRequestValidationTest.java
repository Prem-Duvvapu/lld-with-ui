package com.lld.atm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.atm.controller.AtmController;
import com.lld.atm.dispenser.*;
import com.lld.atm.model.*;
import com.lld.atm.repository.BankingRepository;
import com.lld.config.DomainException;
import com.lld.config.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real Java money/state and HTTP error contracts; no application server or mocked service. */
class AtmRequestValidationTest {
    private static final String ACCOUNT = "ACCOUNT-1";
    private static final String CARD = "CARD-1";
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
    private BankingRepository repository;
    private CashDispenser dispenser;
    private AtmService service;
    private MockMvc http;

    @BeforeEach
    void setUp() {
        repository = new BankingRepository();
        var factory = new DenominationDispenseStrategyFactory(
                new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
        dispenser = new CashDispenser(factory);
        repository.addAccount(Account.builder().id("a1").accountNumber(ACCOUNT).holderName("Ada").balance(1000).build());
        repository.addCard(Card.builder().cardNumber(CARD).accountNumber(ACCOUNT).pin("1234").build());
        service = new AtmService(repository, dispenser, factory);
        http = MockMvcBuilders.standaloneSetup(new AtmController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    static Stream<Arguments> malformedMoneyRequests() {
        return Stream.of("{}", "{\"amount\":null}", "{\"amount\":true}",
                        "{\"amount\":\"500\"}", "{\"amount\":\"NaN\"}", "{\"amount\":\"Infinity\"}",
                        "{\"amount\":[]}", "{\"amount\":{}}", "{\"amount\":0}",
                        "{\"amount\":-100}", "{\"amount\":1e309}")
                .flatMap(body -> Stream.of("deposit", "withdraw", "sim/withdraw")
                        .map(operation -> Arguments.of(operation, body)));
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("malformedMoneyRequests")
    void malformedMoneyIsTyped400WithoutAnyMutation(String operation, String body) throws Exception {
        service.authenticate(CARD, "1234");
        service.simAuthenticate("CARD-SIM-1", "1234");
        String beforeSim = json.writeValueAsString(service.getSimSnapshots());
        Map<NoteDenomination, Integer> beforeNotes = dispenser.getInventory();
        String path = operation.startsWith("sim/") ? "/api/atm/" + operation : "/api/atm/" + ACCOUNT + "/" + operation;
        if (operation.startsWith("sim/")) body = body.substring(0, body.length() - 1)
                + (body.length() > 2 ? "," : "") + "\"accountNumber\":\"ACC-SIM-1\"}";
        http.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidAtmRequestException"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").isString())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
        assertEquals(1000, repository.getAccount(ACCOUNT).getBalance());
        assertEquals(ATMState.AUTHENTICATED, service.getCurrentState());
        assertTrue(service.getTransactions(ACCOUNT).isEmpty());
        assertEquals(beforeNotes, dispenser.getInventory());
        assertEquals(beforeSim, json.writeValueAsString(service.getSimSnapshots()));
    }

    static Stream<Arguments> invalidCredentials() {
        return Stream.of("/insert-card", "/sim/insert-card", "/authenticate", "/sim/authenticate")
                .flatMap(path -> Stream.of("{}", "{\"cardNumber\":null}", "{\"cardNumber\":1234}",
                                "{\"cardNumber\":true}", "{\"cardNumber\":[]}", "{\"cardNumber\":\" \"}")
                        .map(body -> Arguments.of(path, body)));
    }

    @ParameterizedTest
    @MethodSource("invalidCredentials")
    void cardFieldsAreValidatedBeforeLookupOrSessionMutation(String path, String body) throws Exception {
        String before = json.writeValueAsString(service.getSimSnapshots());
        http.perform(post("/api/atm" + path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidAtmRequestException"));
        assertEquals(ATMState.IDLE, service.getCurrentState());
        assertNull(service.getActiveCard());
        assertEquals(0, repository.getCard(CARD).getFailedPinAttempts());
        assertEquals(before, json.writeValueAsString(service.getSimSnapshots()));
    }

    static Stream<Arguments> invalidPins() {
        return Stream.of("null", "1234", "true", "[]", "{}", "\"\"", "\"abc!\"", "\"123\"")
                .flatMap(pin -> Stream.of(false, true).map(sim -> Arguments.of(sim, pin)));
    }

    @ParameterizedTest
    @MethodSource("invalidPins")
    void malformedPinsDoNotInsertCardsOrConsumePinAttempts(boolean sim, String pin) throws Exception {
        String before = json.writeValueAsString(service.getSimSnapshots());
        http.perform(post("/api/atm/" + (sim ? "sim/" : "") + "authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cardNumber\":\"" + (sim ? "CARD-SIM-1" : CARD) + "\",\"pin\":" + pin + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidAtmRequestException"));
        assertEquals(ATMState.IDLE, service.getCurrentState());
        assertEquals(0, repository.getCard(CARD).getFailedPinAttempts());
        assertEquals(before, json.writeValueAsString(service.getSimSnapshots()));
    }

    @Test
    void fractionalOrOutOfRangeWithdrawalNeverDebitsDifferentAmountFromDispensedCash() throws Exception {
        service.authenticate(CARD, "1234");
        service.simAuthenticate("CARD-SIM-1", "1234");
        for (double amount : List.of(500.25, 99.99, 100.0000001, 2147483700.0)) {
            String before = json.writeValueAsString(service.getSimSnapshots());
            assertThrows(DomainException.class, () -> service.withdraw(ACCOUNT, amount));
            assertThrows(DomainException.class, () -> service.simWithdraw("ACC-SIM-1", amount, DispenseMode.MINIMIZE_NOTES));
            assertEquals(1000, repository.getAccount(ACCOUNT).getBalance());
            assertTrue(service.getTransactions(ACCOUNT).isEmpty());
            assertEquals(30000, dispenser.getTotalCashAvailable());
            assertEquals(before, json.writeValueAsString(service.getSimSnapshots()));
        }
    }

    @Test
    void directServiceRejectsNonFiniteDepositsAndBalanceOverflowBeforeMutation() {
        service.authenticate(CARD, "1234");
        for (double amount : new double[]{Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, 0, -1}) {
            assertThrows(DomainException.class, () -> service.deposit(ACCOUNT, amount, null));
            assertEquals(1000, repository.getAccount(ACCOUNT).getBalance());
            assertTrue(service.getTransactions(ACCOUNT).isEmpty());
            assertEquals(ATMState.AUTHENTICATED, service.getCurrentState());
        }
        repository.getAccount(ACCOUNT).setBalance(Double.MAX_VALUE);
        assertThrows(DomainException.class, () -> service.deposit(ACCOUNT, Double.MAX_VALUE, null));
        assertEquals(Double.MAX_VALUE, repository.getAccount(ACCOUNT).getBalance());
        assertTrue(service.getTransactions(ACCOUNT).isEmpty());
    }

    @Test
    void invalidModeNeverLeavesAnAccountDebitedOrTheSessionStuck() throws Exception {
        service.authenticate(CARD, "1234");
        assertThrows(DomainException.class, () -> service.withdraw(ACCOUNT, 500, null));
        assertEquals(1000, repository.getAccount(ACCOUNT).getBalance());
        assertEquals(ATMState.AUTHENTICATED, service.getCurrentState());
        for (String mode : List.of("\"unknown\"", "5", "[]", "{}", "true")) {
            http.perform(post("/api/atm/" + ACCOUNT + "/withdraw").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"amount\":500,\"mode\":" + mode + "}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("InvalidAtmRequestException"));
            assertEquals(1000, repository.getAccount(ACCOUNT).getBalance());
        }
        http.perform(post("/api/atm/" + ACCOUNT + "/withdraw").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500,\"mode\":null}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.amount").value(500));
        assertEquals(500, service.getBalance(ACCOUNT));
    }

    @Test
    void validDepositAndBothWithdrawalModesKeepExistingContractsAndSandboxIsolation() throws Exception {
        service.authenticate(CARD, "1234");
        http.perform(post("/api/atm/" + ACCOUNT + "/deposit").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100.25}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.amount").value(100.25));
        http.perform(post("/api/atm/" + ACCOUNT + "/withdraw").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500,\"mode\":\"CONSERVE_LARGE_NOTES\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dispensedNotes.ONE_HUNDRED").value(5));
        assertEquals(600.25, service.getBalance(ACCOUNT));
        service.simAuthenticate("CARD-SIM-1", "1234");
        http.perform(post("/api/atm/sim/withdraw").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountNumber\":\"ACC-SIM-1\",\"amount\":100}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.activeAccount.balance").value(900));
        assertEquals(600.25, service.getBalance(ACCOUNT));
        assertEquals(2, service.getTransactions(ACCOUNT).size());
    }
}
