package com.lld.atm.service;

import com.lld.atm.dispenser.CashDispenser;
import com.lld.atm.dispenser.ConserveLargeNotesDispenseStrategy;
import com.lld.atm.dispenser.DenominationDispenseStrategyFactory;
import com.lld.atm.dispenser.DispenseMode;
import com.lld.atm.dispenser.GreedyDenominationDispenseStrategy;
import com.lld.atm.exception.*;
import com.lld.atm.model.*;
import com.lld.atm.repository.BankingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AtmServiceTest {

    private BankingRepository bankingRepository;
    private CashDispenser cashDispenser;
    private AtmService atmService;

    @BeforeEach
    public void setUp() {
        bankingRepository = new BankingRepository();
        DenominationDispenseStrategyFactory factory = new DenominationDispenseStrategyFactory(
                new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
        cashDispenser = new CashDispenser(factory);
        atmService = new AtmService(bankingRepository, cashDispenser, factory);

        Account acc = Account.builder().id("acc-1").accountNumber("1234567890").holderName("Alice").balance(1000.0).build(); // Balance ₹1000
        Card card = Card.builder().cardNumber("1111222233334444").pin("1234").accountNumber("1234567890").build();

        bankingRepository.addAccount(acc);
        bankingRepository.addCard(card);
    }

    @Test
    public void testSuccessfulCardInsertionAndPINAuth() {
        Map<String, Object> insertRes = atmService.insertCard("1111222233334444");
        assertEquals(ATMState.CARD_INSERTED, insertRes.get("state"));

        Account authenticatedAcc = atmService.authenticate("1111222233334444", "1234");
        assertNotNull(authenticatedAcc);
        assertEquals("1234567890", authenticatedAcc.getAccountNumber());
        assertEquals(ATMState.AUTHENTICATED, atmService.getCurrentState());
    }

    @Test
    public void testFailedPINLockoutAfter3Attempts() {
        atmService.insertCard("1111222233334444");

        assertThrows(AuthenticationFailedException.class, () -> atmService.authenticate("1111222233334444", "9999"));
        assertThrows(AuthenticationFailedException.class, () -> atmService.authenticate("1111222233334444", "9999"));

        // 3rd attempt must block the card and transition to CARD_BLOCKED
        assertThrows(CardBlockedException.class, () -> atmService.authenticate("1111222233334444", "9999"));
        assertEquals(ATMState.CARD_BLOCKED, atmService.getCurrentState());
        assertTrue(bankingRepository.getCard("1111222233334444").isBlocked());
    }

    @Test
    public void testSuccessfulWithdrawalAndDenominationDispensing() {
        atmService.insertCard("1111222233334444");
        atmService.authenticate("1111222233334444", "1234");

        WithdrawalTransaction txn = atmService.withdraw("1234567890", 500.0);
        assertNotNull(txn);
        assertEquals("SUCCESS", txn.getStatus());
        assertEquals(500.0, atmService.getBalance("1234567890"));

        Map<NoteDenomination, Integer> dispensed = txn.getDispensedNotes();
        assertEquals(1, dispensed.get(NoteDenomination.FIVE_HUNDRED));
    }

    @Test
    public void testDenominationMismatchTriggersCompensatingCredit() {
        // Clear all 500/200/100 notes from dispenser leaving only 2000 notes
        cashDispenser.setNoteCount(NoteDenomination.FIVE_HUNDRED, 0);
        cashDispenser.setNoteCount(NoteDenomination.TWO_HUNDRED, 0);
        cashDispenser.setNoteCount(NoteDenomination.ONE_HUNDRED, 0);

        atmService.insertCard("1111222233334444");
        atmService.authenticate("1111222233334444", "1234");

        // Attempting to withdraw ₹500 when only ₹2000 notes exist must fail and revert balance to ₹1000
        assertThrows(InsufficientCashException.class, () -> atmService.withdraw("1234567890", 500.0));
        assertEquals(1000.0, atmService.getBalance("1234567890"), "Account balance must be reverted via compensating transaction!");
        // A failed withdrawal must settle the session back to AUTHENTICATED, not get stuck mid-transaction
        assertEquals(ATMState.AUTHENTICATED, atmService.getCurrentState());
    }

    @Test
    public void testWithdrawUsingConserveLargeNotesStrategyProducesDifferentBreakdown() {
        atmService.insertCard("1111222233334444");
        atmService.authenticate("1111222233334444", "1234");

        WithdrawalTransaction txn = atmService.withdraw("1234567890", 500.0, DispenseMode.CONSERVE_LARGE_NOTES);
        assertEquals("SUCCESS", txn.getStatus());
        // Conserve-large-notes prefers ₹100/₹200 notes over the single ₹500 note the greedy
        // strategy would pick for the exact same request (see the greedy-strategy test above).
        Map<NoteDenomination, Integer> dispensed = txn.getDispensedNotes();
        assertNull(dispensed.get(NoteDenomination.FIVE_HUNDRED));
        assertEquals(5, dispensed.get(NoteDenomination.ONE_HUNDRED));
    }

    @Test
    public void testWithdrawBeforeAuthenticationIsRejected() {
        // No insertCard/authenticate call at all — the terminal is still IDLE.
        assertThrows(InvalidSessionStateException.class, () -> atmService.withdraw("1234567890", 100.0));
    }

    @Test
    public void testWithdrawAfterOnlyInsertingCardWithoutPinIsRejected() {
        atmService.insertCard("1111222233334444");
        // PIN never verified — still CARD_INSERTED, not AUTHENTICATED.
        assertThrows(InvalidSessionStateException.class, () -> atmService.withdraw("1234567890", 100.0));
    }

    @Test
    public void testWithdrawAgainstAnUnauthenticatedAccountIsRejectedEvenWithASessionOpen() {
        Account other = Account.builder().id("acc-2").accountNumber("9999999999").holderName("Eve").balance(5000.0).build();
        bankingRepository.addAccount(other);

        atmService.insertCard("1111222233334444");
        atmService.authenticate("1111222233334444", "1234");

        // Session is authenticated, but for account 1234567890 — not this one.
        assertThrows(InvalidSessionStateException.class, () -> atmService.withdraw("9999999999", 100.0));
    }

    @Test
    public void testGetBalanceBeforeAuthenticationIsRejected() {
        assertThrows(InvalidSessionStateException.class, () -> atmService.getBalance("1234567890"));
    }

    @Test
    public void testDepositBeforeAuthenticationIsRejected() {
        assertThrows(InvalidSessionStateException.class, () -> atmService.deposit("1234567890", 100.0, null));
    }

    @Test
    public void testEjectCardReturnsSessionToIdleAndBlocksFurtherWithdrawal() {
        atmService.insertCard("1111222233334444");
        atmService.authenticate("1111222233334444", "1234");
        assertEquals(ATMState.AUTHENTICATED, atmService.getCurrentState());

        atmService.ejectCard();
        assertEquals(ATMState.IDLE, atmService.getCurrentState());
        assertThrows(InvalidSessionStateException.class, () -> atmService.withdraw("1234567890", 100.0));
    }

    @Test
    public void testCannotInsertCardWhileAnotherIsAlreadyInTheSlot() {
        atmService.insertCard("1111222233334444");
        assertThrows(InvalidSessionStateException.class, () -> atmService.insertCard("1111222233334444"));
    }
}
