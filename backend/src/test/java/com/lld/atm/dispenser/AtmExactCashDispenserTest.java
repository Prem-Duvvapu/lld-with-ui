package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class AtmExactCashDispenserTest {
    private CashDispenser emptyDispenser() {
        CashDispenser dispenser = new CashDispenser(new DenominationDispenseStrategyFactory(
                new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy()));
        for (NoteDenomination denomination : NoteDenomination.values()) {
            dispenser.setNoteCount(denomination, 0);
        }
        return dispenser;
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void feasiblePlanIsDeductedExactlyOnceAndReturnedMapIsDetached(DispenseMode mode) {
        CashDispenser dispenser = emptyDispenser();
        dispenser.setNoteCount(NoteDenomination.FIVE_HUNDRED, 1);
        dispenser.setNoteCount(NoteDenomination.TWO_HUNDRED, 3);
        Map<NoteDenomination, Integer> result = dispenser.dispenseCash(600, mode);
        assertEquals(Map.of(NoteDenomination.TWO_HUNDRED, 3), result);
        assertEquals(500L, dispenser.getTotalCashAvailable());
        assertEquals(1, dispenser.getInventory().get(NoteDenomination.FIVE_HUNDRED));
        assertEquals(0, dispenser.getInventory().get(NoteDenomination.TWO_HUNDRED));
        result.put(NoteDenomination.FIVE_HUNDRED, 100);
        assertEquals(1, dispenser.getInventory().get(NoteDenomination.FIVE_HUNDRED));
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void infeasibleAndInvalidRequestsLeaveTheWholeCassetteUnchanged(DispenseMode mode) {
        CashDispenser dispenser = emptyDispenser();
        dispenser.setNoteCount(NoteDenomination.FIVE_HUNDRED, 1);
        dispenser.setNoteCount(NoteDenomination.TWO_HUNDRED, 1);
        Map<NoteDenomination, Integer> before = dispenser.getInventory();
        for (int amount : new int[]{100, 300, 800, 150, Integer.MAX_VALUE}) {
            assertThrows(InsufficientCashException.class, () -> dispenser.dispenseCash(amount, mode));
            assertEquals(before, dispenser.getInventory());
        }
        for (int amount : new int[]{0, -100, Integer.MIN_VALUE}) {
            assertThrows(IllegalArgumentException.class, () -> dispenser.dispenseCash(amount, mode));
            assertEquals(before, dispenser.getInventory());
        }
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void wideInventoryTotalsDoNotRejectValidIntAmounts(DispenseMode mode) {
        CashDispenser dispenser = emptyDispenser();
        for (NoteDenomination denomination : NoteDenomination.values()) {
            dispenser.setNoteCount(denomination, Integer.MAX_VALUE);
        }
        long total = 2800L * Integer.MAX_VALUE;
        assertEquals(total, dispenser.getTotalCashAvailable());
        Map<NoteDenomination, Integer> before = dispenser.getInventory();
        Map<NoteDenomination, Integer> result = dispenser.dispenseCash(2_147_483_600, mode);
        assertEquals(total - 2_147_483_600L, dispenser.getTotalCashAvailable());
        for (NoteDenomination denomination : NoteDenomination.values()) {
            assertEquals(before.get(denomination) - result.getOrDefault(denomination, 0),
                    dispenser.getInventory().get(denomination));
        }
    }

    @Test
    void invalidRestocksAndCountOverflowCannotCorruptInventory() {
        CashDispenser dispenser = emptyDispenser();
        Map<NoteDenomination, Integer> before = dispenser.getInventory();
        assertThrows(IllegalArgumentException.class, () -> dispenser.setNoteCount(NoteDenomination.ONE_HUNDRED, -1));
        assertThrows(IllegalArgumentException.class, () -> dispenser.addNotes(NoteDenomination.ONE_HUNDRED, -1));
        assertThrows(IllegalArgumentException.class, () -> dispenser.setNoteCount(null, 1));
        assertThrows(IllegalArgumentException.class, () -> dispenser.addNotes(null, 1));
        assertEquals(before, dispenser.getInventory());

        dispenser.addNotes(NoteDenomination.ONE_HUNDRED, Integer.MAX_VALUE);
        before = dispenser.getInventory();
        assertThrows(IllegalArgumentException.class, () -> dispenser.addNotes(NoteDenomination.ONE_HUNDRED, 1));
        assertEquals(before, dispenser.getInventory());
        dispenser.addNotes(NoteDenomination.ONE_HUNDRED, 0);
        assertEquals(before, dispenser.getInventory());
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void concurrentExactPlansCannotSpendTheSameNotes(DispenseMode mode) throws Exception {
        CashDispenser dispenser = emptyDispenser();
        dispenser.setNoteCount(NoteDenomination.FIVE_HUNDRED, 1);
        dispenser.setNoteCount(NoteDenomination.TWO_HUNDRED, 3);
        var executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> withdraw = () -> {
            ready.countDown();
            assertTrue(start.await(5, TimeUnit.SECONDS));
            try {
                assertEquals(Map.of(NoteDenomination.TWO_HUNDRED, 3), dispenser.dispenseCash(600, mode));
                return true;
            } catch (InsufficientCashException expected) {
                return false;
            }
        };
        try {
            var first = executor.submit(withdraw);
            var second = executor.submit(withdraw);
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            assertNotEquals(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
            assertEquals(500L, dispenser.getTotalCashAvailable());
            assertEquals(1, dispenser.getInventory().get(NoteDenomination.FIVE_HUNDRED));
            assertEquals(0, dispenser.getInventory().get(NoteDenomination.TWO_HUNDRED));
        } finally {
            start.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));
        }
    }
}
