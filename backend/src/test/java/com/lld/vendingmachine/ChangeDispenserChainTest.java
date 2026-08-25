package com.lld.vendingmachine;

import com.lld.vendingmachine.cor.ChangeDispenserChain;
import com.lld.vendingmachine.exception.InsufficientChangeException;
import com.lld.vendingmachine.model.Denomination;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for the Chain of Responsibility that greedily breaks a change amount into the
 * largest available denominations first, falling through to smaller ones.
 */
@DisplayName("Vending Machine Change Dispenser Chain (Chain of Responsibility)")
class ChangeDispenserChainTest {

    private ChangeDispenserChain chain;

    @BeforeEach
    void setUp() {
        chain = new ChangeDispenserChain();
    }

    private Map<Denomination, Integer> fullInventory() {
        Map<Denomination, Integer> inv = new EnumMap<>(Denomination.class);
        for (Denomination d : Denomination.values()) {
            inv.put(d, 50);
        }
        return inv;
    }

    @Test
    @DisplayName("Zero or negative amount dispenses nothing")
    void zeroAmountDispensesNothing() {
        assertTrue(chain.calculateChange(0, fullInventory()).isEmpty());
        assertTrue(chain.calculateChange(-5, fullInventory()).isEmpty());
    }

    @Test
    @DisplayName("Greedily prefers the largest denominations first")
    void greedilyPrefersLargestDenominations() {
        Map<Denomination, Integer> result = chain.calculateChange(65, fullInventory());
        // 65 = 1x50 + 1x10 + 1x5
        assertEquals(1, result.get(Denomination.NOTE_50));
        assertEquals(1, result.get(Denomination.COIN_10));
        assertEquals(1, result.get(Denomination.COIN_5));
        assertNull(result.get(Denomination.NOTE_100));
    }

    @Test
    @DisplayName("Falls through to smaller denominations when the largest is exhausted")
    void fallsThroughWhenLargestExhausted() {
        Map<Denomination, Integer> inv = fullInventory();
        inv.put(Denomination.NOTE_50, 0);

        Map<Denomination, Integer> result = chain.calculateChange(65, inv);
        // No ₹50 available -> falls through: 3x ₹20 + 1x ₹5
        assertEquals(3, result.get(Denomination.NOTE_20));
        assertEquals(1, result.get(Denomination.COIN_5));
        assertNull(result.get(Denomination.NOTE_50));
    }

    @Test
    @DisplayName("Exact change impossible: chain exhausts every handler and throws InsufficientChangeException")
    void exactChangeImpossibleThrowsAfterExhaustingChain() {
        // Only coin-2 available; 3 units means max representable is 6. Asking for 7 must fail
        // after falling through every handler down to the smallest denomination.
        Map<Denomination, Integer> inv = new EnumMap<>(Denomination.class);
        for (Denomination d : Denomination.values()) {
            inv.put(d, 0);
        }
        inv.put(Denomination.COIN_2, 3);

        InsufficientChangeException ex = assertThrows(InsufficientChangeException.class,
                () -> chain.calculateChange(7, inv));
        assertTrue(ex.getMessage().contains("Unable to provide exact change"));
    }

    @Test
    @DisplayName("Exact change impossible: completely empty hopper always fails")
    void emptyHopperAlwaysFails() {
        Map<Denomination, Integer> inv = new EnumMap<>(Denomination.class);
        for (Denomination d : Denomination.values()) {
            inv.put(d, 0);
        }
        assertThrows(InsufficientChangeException.class, () -> chain.calculateChange(15, inv));
    }

    @Test
    @DisplayName("A partial-denomination mix that cannot sum exactly still fails cleanly")
    void oddAmountWithOnlyEvenDenominationsFails() {
        // Only coin-2 and coin-10 available (both even); an odd remainder of ₹1 is
        // unrepresentable no matter how the chain falls through.
        Map<Denomination, Integer> inv = new EnumMap<>(Denomination.class);
        for (Denomination d : Denomination.values()) {
            inv.put(d, 0);
        }
        inv.put(Denomination.COIN_10, 5);
        inv.put(Denomination.COIN_2, 5);

        assertThrows(InsufficientChangeException.class, () -> chain.calculateChange(11, inv));
    }

    @Test
    @DisplayName("The chain does not mutate the caller's inventory map")
    void doesNotMutateCallerInventory() {
        Map<Denomination, Integer> inv = fullInventory();
        Map<Denomination, Integer> before = new EnumMap<>(inv);

        chain.calculateChange(65, inv);

        assertEquals(before, inv, "calculateChange must work on a copy, not the caller's map");
    }
}
