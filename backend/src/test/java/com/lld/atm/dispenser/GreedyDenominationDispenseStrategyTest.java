package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class GreedyDenominationDispenseStrategyTest {

    private final GreedyDenominationDispenseStrategy strategy = new GreedyDenominationDispenseStrategy();

    private Map<NoteDenomination, Integer> abundantInventory() {
        Map<NoteDenomination, Integer> inv = new EnumMap<>(NoteDenomination.class);
        inv.put(NoteDenomination.TWO_THOUSAND, 5);
        inv.put(NoteDenomination.FIVE_HUNDRED, 20);
        inv.put(NoteDenomination.TWO_HUNDRED, 25);
        inv.put(NoteDenomination.ONE_HUNDRED, 50);
        return inv;
    }

    @Test
    public void picksLargestDenominationsFirst() {
        Map<NoteDenomination, Integer> result = strategy.calculateNotes(2700, abundantInventory());
        assertEquals(1, result.get(NoteDenomination.TWO_THOUSAND));
        assertEquals(1, result.get(NoteDenomination.FIVE_HUNDRED));
        assertEquals(1, result.get(NoteDenomination.TWO_HUNDRED));
        assertNull(result.get(NoteDenomination.ONE_HUNDRED));
    }

    @Test
    public void exactSingleDenominationMatch() {
        Map<NoteDenomination, Integer> result = strategy.calculateNotes(500, abundantInventory());
        assertEquals(1, result.get(NoteDenomination.FIVE_HUNDRED));
        assertNull(result.get(NoteDenomination.TWO_THOUSAND));
    }

    @Test
    public void fallsBackToSmallerDenominationsWhenLargeOnesAreDepleted() {
        Map<NoteDenomination, Integer> inv = new EnumMap<>(NoteDenomination.class);
        inv.put(NoteDenomination.TWO_THOUSAND, 0);
        inv.put(NoteDenomination.FIVE_HUNDRED, 0);
        inv.put(NoteDenomination.TWO_HUNDRED, 10);
        inv.put(NoteDenomination.ONE_HUNDRED, 10);

        Map<NoteDenomination, Integer> result = strategy.calculateNotes(500, inv);
        assertEquals(2, result.get(NoteDenomination.TWO_HUNDRED));
        assertEquals(1, result.get(NoteDenomination.ONE_HUNDRED));
    }

    @Test
    public void throwsInsufficientCashWhenExactAmountIsUnreachable() {
        // Only ₹2000 notes in stock: ₹500 can never be made exactly.
        Map<NoteDenomination, Integer> inv = new EnumMap<>(NoteDenomination.class);
        inv.put(NoteDenomination.TWO_THOUSAND, 5);
        inv.put(NoteDenomination.FIVE_HUNDRED, 0);
        inv.put(NoteDenomination.TWO_HUNDRED, 0);
        inv.put(NoteDenomination.ONE_HUNDRED, 0);

        assertThrows(InsufficientCashException.class, () -> strategy.calculateNotes(500, inv));
    }

    @Test
    public void rejectsAmountNotAMultipleOfHundred() {
        assertThrows(InsufficientCashException.class, () -> strategy.calculateNotes(150, abundantInventory()));
    }

    @Test
    public void rejectsZeroOrNegativeAmount() {
        assertThrows(IllegalArgumentException.class, () -> strategy.calculateNotes(0, abundantInventory()));
        assertThrows(IllegalArgumentException.class, () -> strategy.calculateNotes(-100, abundantInventory()));
    }
}
