package com.lld.atm.dispenser;

import com.lld.atm.controller.AtmController;
import com.lld.atm.model.*;
import com.lld.atm.repository.BankingRepository;
import com.lld.atm.service.AtmService;
import com.lld.config.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Exact-plan regressions through the real controller/service/advice, without a server. */
class AtmExactPlanHttpTest {
    private CashDispenser dispenser;
    private AtmService service;
    private BankingRepository repository;
    private MockMvc http;

    @BeforeEach
    void setUp() {
        var factory = new DenominationDispenseStrategyFactory(
                new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
        dispenser = new CashDispenser(factory);
        for (NoteDenomination denomination : NoteDenomination.values()) {
            dispenser.setNoteCount(denomination, 0);
        }
        repository = new BankingRepository();
        repository.addAccount(Account.builder().id("exact").accountNumber("EXACT-1")
                .holderName("Ada").balance(1000).build());
        repository.addCard(Card.builder().cardNumber("CARD-EXACT").accountNumber("EXACT-1").pin("1234").build());
        service = new AtmService(repository, dispenser, factory);
        service.insertCard("CARD-EXACT");
        service.authenticate("CARD-EXACT", "1234");
        http = MockMvcBuilders.standaloneSetup(new AtmController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void exactPlanSucceedsWhereLargestFirstStrandsRemainderAndInfeasibleRequestCompensates(DispenseMode mode) throws Exception {
        dispenser.setNoteCount(NoteDenomination.FIVE_HUNDRED, 1);
        dispenser.setNoteCount(NoteDenomination.TWO_HUNDRED, 3);
        http.perform(post("/api/atm/EXACT-1/withdraw").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":600,\"mode\":\"" + mode + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.dispensedNotes.TWO_HUNDRED").value(3))
                .andExpect(jsonPath("$.dispensedNotes.FIVE_HUNDRED").doesNotExist());
        assertEquals(400, repository.getAccount("EXACT-1").getBalance());
        assertEquals(500L, dispenser.getTotalCashAvailable());
        Map<NoteDenomination, Integer> before = dispenser.getInventory();
        http.perform(post("/api/atm/EXACT-1/withdraw").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":100,\"mode\":\"" + mode + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("InsufficientCashException"))
                .andExpect(jsonPath("$.status").value(409));
        assertEquals(400, repository.getAccount("EXACT-1").getBalance());
        assertEquals(before, dispenser.getInventory());
        assertEquals(ATMState.AUTHENTICATED, service.getCurrentState());
        assertEquals(2, service.getTransactions("EXACT-1").size());
        assertTrue(service.getTransactions("EXACT-1").stream().anyMatch(t -> "FAILED".equals(t.getStatus())));
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void exactPlanSucceedsWhereSmallestFirstStrandsRemainder(DispenseMode mode) throws Exception {
        for (NoteDenomination denomination : new NoteDenomination[]{NoteDenomination.ONE_HUNDRED,
                NoteDenomination.TWO_HUNDRED, NoteDenomination.FIVE_HUNDRED}) {
            dispenser.setNoteCount(denomination, 1);
        }
        http.perform(post("/api/atm/EXACT-1/withdraw").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500,\"mode\":\"" + mode + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dispensedNotes.FIVE_HUNDRED").value(1))
                .andExpect(jsonPath("$.dispensedNotes.TWO_HUNDRED").doesNotExist())
                .andExpect(jsonPath("$.dispensedNotes.ONE_HUNDRED").doesNotExist());
        assertEquals(500, repository.getAccount("EXACT-1").getBalance());
        assertEquals(300L, dispenser.getTotalCashAvailable());
    }

    @Test
    void httpCashTotalRetainsLongArithmetic() throws Exception {
        for (NoteDenomination denomination : NoteDenomination.values()) {
            dispenser.setNoteCount(denomination, Integer.MAX_VALUE);
        }
        http.perform(get("/api/atm/dispenser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCash").value(2800L * Integer.MAX_VALUE));
    }
}
