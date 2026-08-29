package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class ConserveLargeNotesDispenseStrategyTest {

    private final ConserveLargeNotesDispenseStrategy strategy = new ConserveLargeNotesDispenseStrategy();
    private final GreedyDenominationDispenseStrategy greedy = new GreedyDenominationDispenseStrategy();

    private Map<NoteDenomination, Integer> abundantInventory() {
        Map<NoteDenomination, Integer> inv = new EnumMap<>(NoteDenomination.class);
        inv.put(NoteDenomination.TWO_THOUSAND, 5);
        inv.put(NoteDenomination.FIVE_HUNDRED, 20);
        inv.put(NoteDenomination.TWO_HUNDRED, 25);
        inv.put(NoteDenomination.ONE_HUNDRED, 50);
        return inv;
    }

    @Test
    public void picksSmallestDenominationsFirst() {
        Map<NoteDenomination, Integer> result = strategy.calculateNotes(500, abundantInventory());
        assertEquals(5, result.get(NoteDenomination.ONE_HUNDRED));
        assertNull(result.get(NoteDenomination.FIVE_HUNDRED));
    }

    @Test
    public void producesADifferentBreakdownThanTheGreedyStrategyForTheSameRequest() {
        Map<NoteDenomination, Integer> conservative = strategy.calculateNotes(700, abundantInventory());
        Map<NoteDenomination, Integer> minimal = greedy.calculateNotes(700, abundantInventory());

        // Greedy: 1x500 + 1x200 (2 notes, minimizes note count). Conservative: 7x100 (7 notes) —
        // it spends the smallest denomination all the way down before ever touching a ₹200 or
        // ₹500, since ₹100 alone is enough to cover the request.
        assertNotEquals(minimal, conservative);
        assertNull(conservative.get(NoteDenomination.FIVE_HUNDRED));
        assertEquals(1, minimal.get(NoteDenomination.FIVE_HUNDRED));
    }

    @Test
    public void conservesLargeNotesWhenSmallDenominationsAreExhausted() {
        Map<NoteDenomination, Integer> inv = new EnumMap<>(NoteDenomination.class);
        inv.put(NoteDenomination.TWO_THOUSAND, 5);
        inv.put(NoteDenomination.FIVE_HUNDRED, 0);
        inv.put(NoteDenomination.TWO_HUNDRED, 0);
        inv.put(NoteDenomination.ONE_HUNDRED, 0);

        Map<NoteDenomination, Integer> result = strategy.calculateNotes(2000, inv);
        assertEquals(1, result.get(NoteDenomination.TWO_THOUSAND));
    }

    @Test
    public void throwsInsufficientCashWhenExactAmountIsUnreachable() {
        Map<NoteDenomination, Integer> inv = new EnumMap<>(NoteDenomination.class);
        inv.put(NoteDenomination.TWO_THOUSAND, 1);
        inv.put(NoteDenomination.FIVE_HUNDRED, 0);
        inv.put(NoteDenomination.TWO_HUNDRED, 0);
        inv.put(NoteDenomination.ONE_HUNDRED, 1); // ₹2100 total, but no combination makes ₹300

        assertThrows(InsufficientCashException.class, () -> strategy.calculateNotes(300, inv));
    }

    @Test
    public void rejectsAmountNotAMultipleOfHundred() {
        assertThrows(InsufficientCashException.class, () -> strategy.calculateNotes(250, abundantInventory()));
    }
}
