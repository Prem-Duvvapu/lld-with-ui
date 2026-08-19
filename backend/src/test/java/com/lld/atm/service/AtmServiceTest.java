package com.lld.atm.service;

import com.lld.atm.dispenser.CashDispenser;
import com.lld.atm.dispenser.GreedyDenominationDispenseStrategy;
import com.lld.atm.exception.*;
import com.lld.atm.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class AtmServiceTest {

    private BankingService bankingService;
    private CashDispenser cashDispenser;
    private AtmService atmService;

    @BeforeEach
    public void setUp() {
        bankingService = new BankingService();
        cashDispenser = new CashDispenser(new GreedyDenominationDispenseStrategy());
        atmService = new AtmService(bankingService, cashDispenser);

        Account acc = new Account("acc-1", "1234567890", "Alice", 1000.0); // Balance ₹1000
        Card card = new Card("1111222233334444", "1234", "1234567890");

        bankingService.addAccount(acc);
        bankingService.addCard(card);
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
        assertTrue(bankingService.getCard("1111222233334444").isBlocked());
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
    }

    @Test
    public void test10ConcurrentWithdrawalThreadsZeroOverdraw() throws Exception {
        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numThreads; i++) {
            futures.add(executor.submit(() -> {
                try {
                    latch.await(); // Synchronize all 10 threads to attempt withdrawal simultaneously
                    atmService.withdraw("1234567890", 600.0);
                    successCount.incrementAndGet();
                } catch (InsufficientBalanceException e) {
                    failCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }));
        }

        // Release all 10 withdrawal threads simultaneously
        latch.countDown();

        for (Future<?> future : futures) {
            future.get(5, TimeUnit.SECONDS);
        }

        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        // EXACTLY 1 withdrawal of ₹600 must succeed, 9 must fail with InsufficientBalanceException!
        assertEquals(1, successCount.get(), "Exactly 1 withdrawal of ₹600 should succeed!");
        assertEquals(9, failCount.get(), "Exactly 9 withdrawals should fail with InsufficientBalanceException!");
        assertEquals(400.0, atmService.getBalance("1234567890"), "Account balance must be exactly ₹400 (no negative overdraw)!");
    }
}
