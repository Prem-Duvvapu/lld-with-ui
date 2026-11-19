package com.lld.atm.service;

import com.lld.atm.dispenser.*;
import com.lld.atm.exception.InvalidSessionStateException;
import com.lld.atm.model.*;
import com.lld.atm.repository.BankingRepository;
import org.junit.jupiter.api.Test;
import java.util.Map;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class AtmLiveLifecycleTest {
    private final DenominationDispenseStrategyFactory factory = new DenominationDispenseStrategyFactory(
            new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());
    private final BankingRepository bank = new BankingRepository();
    private AtmService terminal(CashDispenser cash) {
        bank.addAccount(Account.builder().id("a").accountNumber("A").holderName("Alice").balance(1000).build());
        bank.addAccount(Account.builder().id("b").accountNumber("B").holderName("Bob").balance(2000).build());
        bank.addCard(Card.builder().cardNumber("CARD-A").pin("1234").accountNumber("A").build());
        bank.addCard(Card.builder().cardNumber("CARD-B").pin("4321").accountNumber("B").build());
        return new AtmService(bank, cash, factory);
    }
    @Test void anotherCardCannotAuthenticateOrConsumeTheInsertedCardsPinAttempts() {
        AtmService atm = terminal(new CashDispenser(factory)); atm.insertCard("CARD-A");
        assertThrows(InvalidSessionStateException.class, () -> atm.authenticate("CARD-B", "1234"));
        assertEquals(ATMState.CARD_INSERTED, atm.getCurrentState());
        assertThrows(InvalidSessionStateException.class, () -> atm.authenticate("CARD-B", "9999"));
        assertEquals(0, bank.getCard("CARD-A").getFailedPinAttempts());
        assertEquals("A", atm.authenticate("CARD-A", "1234").getAccountNumber());
    }
    @Test void ejectWaitsForAdmittedDispensingAndCannotBeUndoneByItsCompletion() throws Exception {
        CountDownLatch dispensing = new CountDownLatch(1), release = new CountDownLatch(1);
        CashDispenser cash = new CashDispenser(factory) {
            @Override public Map<NoteDenomination, Integer> dispenseCash(int amount, DispenseMode mode) {
                dispensing.countDown();
                try { assertTrue(release.await(5, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AssertionError(e); }
                return super.dispenseCash(amount, mode);
            }
        };
        AtmService atm = terminal(cash); atm.insertCard("CARD-A"); atm.authenticate("CARD-A", "1234");
        ExecutorService workers = Executors.newFixedThreadPool(2);
        try {
            Future<WithdrawalTransaction> withdrawal = workers.submit(() -> atm.withdraw("A", 500));
            assertTrue(dispensing.await(5, TimeUnit.SECONDS));
            CountDownLatch ejectStarted = new CountDownLatch(1);
            Future<Map<String, Object>> eject = workers.submit(() -> { ejectStarted.countDown(); return atm.ejectCard(); });
            assertTrue(ejectStarted.await(5, TimeUnit.SECONDS));
            try { assertThrows(TimeoutException.class, () -> eject.get(150, TimeUnit.MILLISECONDS), "Ejection must wait until the admitted transaction settles"); }
            finally { release.countDown(); }
            assertEquals("SUCCESS", withdrawal.get(5, TimeUnit.SECONDS).getStatus());
            assertEquals(ATMState.IDLE, eject.get(5, TimeUnit.SECONDS).get("state"));
            assertEquals(ATMState.IDLE, atm.getCurrentState());
            assertNull(atm.getActiveAccount()); assertNull(atm.getActiveCard());
            assertEquals(500, bank.getAccount("A").getBalance());
            atm.insertCard("CARD-B"); atm.authenticate("CARD-B", "4321");
            assertEquals(2000, atm.getBalance("B"));
            assertThrows(InvalidSessionStateException.class, () -> atm.withdraw("A", 100));
        } finally { release.countDown(); workers.shutdownNow(); assertTrue(workers.awaitTermination(5, TimeUnit.SECONDS)); }
    }
    @Test void authenticatedAccountAndReceiptsAreDetachedFromLiveBalancesAndAuditRecords() {
        AtmService atm = terminal(new CashDispenser(factory)); atm.insertCard("CARD-A");
        Account account = atm.authenticate("CARD-A", "1234"); WithdrawalTransaction receipt = atm.withdraw("A", 500);
        account.setBalance(1); receipt.setStatus("CORRUPTED"); receipt.getDispensedNotes().clear();
        assertEquals(500, atm.getBalance("A"));
        WithdrawalTransaction recorded = (WithdrawalTransaction) atm.getTransactions("A").get(0);
        assertEquals("SUCCESS", recorded.getStatus());
        assertEquals(Map.of(NoteDenomination.FIVE_HUNDRED, 1), recorded.getDispensedNotes());
        recorded.setFailureReason("changed"); assertNull(atm.getTransactions("A").get(0).getFailureReason());
    }
}
