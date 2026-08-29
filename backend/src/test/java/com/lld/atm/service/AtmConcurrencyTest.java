package com.lld.atm.service;

import com.lld.atm.dispenser.CashDispenser;
import com.lld.atm.dispenser.ConserveLargeNotesDispenseStrategy;
import com.lld.atm.dispenser.DenominationDispenseStrategyFactory;
import com.lld.atm.dispenser.GreedyDenominationDispenseStrategy;
import com.lld.atm.exception.InsufficientBalanceException;
import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.Account;
import com.lld.atm.model.Card;
import com.lld.atm.model.NoteDenomination;
import com.lld.atm.repository.BankingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The real race this module has to get right: N threads hammering {@code withdraw} at once must
 * never let the account go negative and must never dispense notes the cassette does not have —
 * proven with real threads and a {@link CountDownLatch}, not sleeps, matching
 * {@code AirlineConcurrencyTest}/{@code ConcertTicketConcurrencyTest}'s shape.
 */
public class AtmConcurrencyTest {

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
    }

    @RepeatedTest(5)
    public void tenConcurrentWithdrawalsOnSameAccount_exactlyOneSucceedsNoOverdraw() throws Exception {
        Account acc = Account.builder().id("acc-race").accountNumber("RACE-1").holderName("Racer").balance(600.0).build();
        Card card = Card.builder().cardNumber("CARD-RACE-1").pin("1111").accountNumber("RACE-1").build();
        bankingRepository.addAccount(acc);
        bankingRepository.addCard(card);

        atmService.insertCard("CARD-RACE-1");
        atmService.authenticate("CARD-RACE-1", "1111");

        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch readyLatch = new CountDownLatch(numThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numThreads; i++) {
            futures.add(executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    atmService.withdraw("RACE-1", 600.0);
                    successCount.incrementAndGet();
                } catch (InsufficientBalanceException e) {
                    failCount.incrementAndGet();
                } catch (Exception e) {
                    fail("Unexpected exception racing withdraw(): " + e);
                }
                return null;
            }));
        }

        assertTrue(readyLatch.await(5, TimeUnit.SECONDS), "all worker threads must reach the gate");
        startLatch.countDown(); // release all 10 threads at once

        for (Future<?> future : futures) {
            future.get(5, TimeUnit.SECONDS);
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(1, successCount.get(), "exactly one ₹600 withdrawal must succeed against a ₹600 balance");
        assertEquals(9, failCount.get(), "the other nine must fail with InsufficientBalanceException, never overdraw");
        assertEquals(0.0, atmService.getBalance("RACE-1"), 0.0001, "balance must land at exactly ₹0, never negative");
    }

    @Test
    public void tenConcurrentWithdrawals_transactionLogHasExactlyOneSuccessEntry() throws Exception {
        Account acc = Account.builder().id("acc-log").accountNumber("LOG-1").holderName("Logger").balance(600.0).build();
        Card card = Card.builder().cardNumber("CARD-LOG-1").pin("2222").accountNumber("LOG-1").build();
        bankingRepository.addAccount(acc);
        bankingRepository.addCard(card);

        atmService.insertCard("CARD-LOG-1");
        atmService.authenticate("CARD-LOG-1", "2222");

        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numThreads; i++) {
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await();
                    try {
                        atmService.withdraw("LOG-1", 600.0);
                    } catch (InsufficientBalanceException ignored) {
                        // expected for 9 of the 10
                    }
                } catch (InterruptedException ignored) {
                }
                return null;
            }));
        }
        startLatch.countDown();
        for (Future<?> f : futures) {
            f.get(5, TimeUnit.SECONDS);
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        long successEntries = atmService.getTransactions("LOG-1").stream()
                .filter(t -> "SUCCESS".equals(t.getStatus()))
                .count();
        long failedEntries = atmService.getTransactions("LOG-1").stream()
                .filter(t -> "FAILED".equals(t.getStatus()))
                .count();

        assertEquals(1, successEntries, "the audit log must record exactly one successful withdrawal");
        assertEquals(9, failedEntries, "the audit log must record all nine rejected attempts too");
    }

    /**
     * The other half of "must not double-spend": the shared physical cash cassette. Several
     * threads racing {@code CashDispenser#dispenseCash} directly (independent of any one account)
     * must never collectively dispense more notes than the cassette actually holds — proving the
     * dispenser's own lock, not just the per-account lock, is what keeps inventory non-negative.
     */
    @RepeatedTest(5)
    public void concurrentDispenseRequests_neverDispenseMoreThanCassetteHolds() throws Exception {
        DenominationDispenseStrategyFactory factory = new DenominationDispenseStrategyFactory(
                new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
        CashDispenser dispenser = new CashDispenser(factory);
        dispenser.setNoteCount(NoteDenomination.TWO_THOUSAND, 0);
        dispenser.setNoteCount(NoteDenomination.FIVE_HUNDRED, 0);
        dispenser.setNoteCount(NoteDenomination.TWO_HUNDRED, 0);
        dispenser.setNoteCount(NoteDenomination.ONE_HUNDRED, 5); // exactly ₹500 total in the cassette

        int numThreads = 10; // 10 threads each try to withdraw ₹100 -> only 5 can possibly succeed
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numThreads; i++) {
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await();
                    dispenser.dispenseCash(100);
                    successCount.incrementAndGet();
                } catch (InsufficientCashException e) {
                    failCount.incrementAndGet();
                } catch (InterruptedException ignored) {
                }
                return null;
            }));
        }
        startLatch.countDown();
        for (Future<?> f : futures) {
            f.get(5, TimeUnit.SECONDS);
        }
        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        assertEquals(5, successCount.get(), "exactly 5 of the 10 ₹100 requests can be filled from a ₹500 cassette");
        assertEquals(5, failCount.get(), "the other 5 must fail with InsufficientCashException, never dispense phantom notes");
        assertEquals(0, dispenser.getTotalCashAvailable(), "cassette must land at exactly ₹0, never negative");
    }
}
