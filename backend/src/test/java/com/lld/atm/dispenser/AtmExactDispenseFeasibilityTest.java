package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class AtmExactDispenseFeasibilityTest {
    private final DenominationDispenseStrategyFactory factory = new DenominationDispenseStrategyFactory(
            new GreedyDenominationDispenseStrategy(), new ConserveLargeNotesDispenseStrategy());

    @Test
    void minimizeNotesCanSkipAnAvailableFiveHundredToMakeSixHundred() {
        Map<NoteDenomination, Integer> inventory = Map.of(
                NoteDenomination.FIVE_HUNDRED, 1,
                NoteDenomination.TWO_HUNDRED, 3);

        assertEquals(Map.of(NoteDenomination.TWO_HUNDRED, 3),
                new GreedyDenominationDispenseStrategy().calculateNotes(600, inventory));
    }

    @Test
    void conserveLargeNotesCanLeaveSmallNotesUnusedToMakeFiveHundred() {
        Map<NoteDenomination, Integer> inventory = Map.of(
                NoteDenomination.ONE_HUNDRED, 1,
                NoteDenomination.TWO_HUNDRED, 1,
                NoteDenomination.FIVE_HUNDRED, 1);

        assertEquals(Map.of(NoteDenomination.FIVE_HUNDRED, 1),
                new ConserveLargeNotesDispenseStrategy().calculateNotes(500, inventory));
    }

    @Test
    @Timeout(value = 30, unit = TimeUnit.SECONDS)
    void bothPoliciesMatchIndependentBruteForceForEverySmallInventoryAndAmount() {
        int checked = 0;
        for (int thousands = 0; thousands <= 3; thousands++) {
            for (int hundreds = 0; hundreds <= 3; hundreds++) {
                for (int twos = 0; twos <= 3; twos++) {
                    for (int ones = 0; ones <= 3; ones++) {
                        checked += verifyAgainstOracle(new Plan(thousands, hundreds, twos, ones));
                    }
                }
            }
        }
        assertEquals(22_016, checked); // 256 inventories, every positive ₹100 step through total + ₹100.
    }

    @Test
    @Timeout(value = 10, unit = TimeUnit.SECONDS)
    void oracleAlsoCoversFullBundleBoundariesAndMultipleBundles() {
        int checked = verifyAgainstOracle(new Plan(1, 4, 10, 20));
        checked += verifyAgainstOracle(new Plan(3, 8, 20, 40));
        checked += verifyAgainstOracle(new Plan(0, 8, 20, 40));
        assertEquals(766, checked);
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    @Timeout(value = 5, unit = TimeUnit.SECONDS)
    void handlesLargestIntMultipleOfHundredAndHugeInventories(DispenseMode mode) {
        int amount = 2_147_483_600;
        Map<NoteDenomination, Integer> inventory = new EnumMap<>(NoteDenomination.class);
        for (NoteDenomination denomination : NoteDenomination.values()) {
            inventory.put(denomination, Integer.MAX_VALUE);
        }
        Map<NoteDenomination, Integer> expected = mode == DispenseMode.MINIMIZE_NOTES
                ? Map.of(NoteDenomination.TWO_THOUSAND, 1_073_741,
                NoteDenomination.FIVE_HUNDRED, 3, NoteDenomination.ONE_HUNDRED, 1)
                : Map.of(NoteDenomination.ONE_HUNDRED, 21_474_836);

        assertEquals(expected, factory.forMode(mode).calculateNotes(amount, inventory));
        assertTrue(inventory.values().stream().allMatch(count -> count == Integer.MAX_VALUE));
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    @Timeout(value = 5, unit = TimeUnit.SECONDS)
    void rejectsLargeImpossibleAmountWithoutSearchingInventoryCounts(DispenseMode mode) {
        Map<NoteDenomination, Integer> inventory = Map.of(
                NoteDenomination.TWO_THOUSAND, Integer.MAX_VALUE);
        assertThrows(InsufficientCashException.class,
                () -> factory.forMode(mode).calculateNotes(2_147_483_600, inventory));
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void validatesAmountsAndMalformedInventory(DispenseMode mode) {
        DenominationDispenseStrategy strategy = factory.forMode(mode);
        Map<NoteDenomination, Integer> inventory = Map.of(NoteDenomination.ONE_HUNDRED, 10);
        for (int amount : new int[]{0, -100, Integer.MIN_VALUE}) {
            assertThrows(IllegalArgumentException.class, () -> strategy.calculateNotes(amount, inventory));
        }
        for (int amount : new int[]{1, 150, Integer.MAX_VALUE}) {
            assertThrows(InsufficientCashException.class, () -> strategy.calculateNotes(amount, inventory));
        }
        assertThrows(InsufficientCashException.class, () -> strategy.calculateNotes(100, Map.of()));
        assertThrows(IllegalArgumentException.class, () -> strategy.calculateNotes(100, null));
        Map<NoteDenomination, Integer> invalid = new HashMap<>();
        invalid.put(NoteDenomination.ONE_HUNDRED, -1);
        assertThrows(IllegalArgumentException.class, () -> strategy.calculateNotes(100, invalid));
        invalid.put(NoteDenomination.ONE_HUNDRED, null);
        assertThrows(IllegalArgumentException.class, () -> strategy.calculateNotes(100, invalid));
        invalid.clear();
        invalid.put(null, 1);
        assertThrows(IllegalArgumentException.class, () -> strategy.calculateNotes(100, invalid));
    }

    @ParameterizedTest
    @EnumSource(DispenseMode.class)
    void returnsDetachedPlanAndLeavesInputUnchangedOnSuccessAndFailure(DispenseMode mode) {
        Map<NoteDenomination, Integer> inventory = new EnumMap<>(NoteDenomination.class);
        inventory.put(NoteDenomination.FIVE_HUNDRED, 1);
        inventory.put(NoteDenomination.TWO_HUNDRED, 3);
        Map<NoteDenomination, Integer> before = Map.copyOf(inventory);
        Map<NoteDenomination, Integer> result = factory.forMode(mode).calculateNotes(600, inventory);
        assertEquals(before, inventory);
        result.clear();
        assertEquals(before, inventory);
        assertThrows(InsufficientCashException.class, () -> factory.forMode(mode).calculateNotes(100, inventory));
        assertEquals(before, inventory);
    }

    private int verifyAgainstOracle(Plan stock) {
        // Enumerate actual counts independently: no bundles, residues, or production helper calls.
        Comparator<Plan> minimal = Comparator.comparingInt(Plan::noteCount)
                .thenComparing(Comparator.comparingInt(Plan::thousands).reversed())
                .thenComparing(Comparator.comparingInt(Plan::hundreds).reversed())
                .thenComparing(Comparator.comparingInt(Plan::twos).reversed());
        Comparator<Plan> conservative = Comparator.comparingInt(Plan::thousands)
                .thenComparingInt(Plan::hundreds).thenComparingInt(Plan::twos).thenComparingInt(Plan::ones);
        Map<Integer, Plan> minimumByAmount = new HashMap<>();
        Map<Integer, Plan> conservedByAmount = new HashMap<>();
        for (int thousands = 0; thousands <= stock.thousands(); thousands++) {
            for (int hundreds = 0; hundreds <= stock.hundreds(); hundreds++) {
                for (int twos = 0; twos <= stock.twos(); twos++) {
                    for (int ones = 0; ones <= stock.ones(); ones++) {
                        Plan plan = new Plan(thousands, hundreds, twos, ones);
                        minimumByAmount.merge(plan.amount(), plan, (a, b) -> minimal.compare(a, b) <= 0 ? a : b);
                        conservedByAmount.merge(plan.amount(), plan, (a, b) -> conservative.compare(a, b) <= 0 ? a : b);
                    }
                }
            }
        }
        int checked = 0;
        Map<NoteDenomination, Integer> inventory = stock.breakdown();
        for (DispenseMode mode : DispenseMode.values()) {
            Map<Integer, Plan> oracle = mode == DispenseMode.MINIMIZE_NOTES ? minimumByAmount : conservedByAmount;
            for (int amount = 100; amount <= stock.amount() + 100; amount += 100) {
                int requested = amount;
                Plan expected = oracle.get(amount);
                String context = mode + ", stock=" + stock + ", amount=" + amount;
                if (expected == null) {
                    assertThrows(InsufficientCashException.class,
                            () -> factory.forMode(mode).calculateNotes(requested, inventory), context);
                } else {
                    Map<NoteDenomination, Integer> actual = factory.forMode(mode).calculateNotes(amount, inventory);
                    assertEquals(expected.breakdown(), actual, context);
                    assertEquals((long) amount, actual.entrySet().stream()
                            .mapToLong(e -> (long) e.getKey().getValue() * e.getValue()).sum(), context);
                    assertTrue(actual.entrySet().stream()
                            .allMatch(e -> e.getValue() > 0 && e.getValue() <= inventory.get(e.getKey())), context);
                }
                assertEquals(stock.breakdown(), inventory, context);
                checked++;
            }
        }
        return checked;
    }

    private record Plan(int thousands, int hundreds, int twos, int ones) {
        int amount() {
            return 2000 * thousands + 500 * hundreds + 200 * twos + 100 * ones;
        }

        int noteCount() {
            return thousands + hundreds + twos + ones;
        }

        Map<NoteDenomination, Integer> breakdown() {
            Map<NoteDenomination, Integer> result = new EnumMap<>(NoteDenomination.class);
            if (thousands > 0) result.put(NoteDenomination.TWO_THOUSAND, thousands);
            if (hundreds > 0) result.put(NoteDenomination.FIVE_HUNDRED, hundreds);
            if (twos > 0) result.put(NoteDenomination.TWO_HUNDRED, twos);
            if (ones > 0) result.put(NoteDenomination.ONE_HUNDRED, ones);
            return result;
        }
    }
}
