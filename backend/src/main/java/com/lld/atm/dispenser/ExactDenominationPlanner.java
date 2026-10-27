package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Exact bounded change for the fixed ₹2000/₹500/₹200/₹100 cassette.
 *
 * <p>Write each note count as a residue plus whole ₹2000 bundles: bundle sizes are
 * 1, 4, 10 and 20 notes respectively. Every feasible plan has exactly one such
 * decomposition. There are at most 1 * 4 * 10 * 20 = 800 residue vectors, independent
 * of the amount and inventory counts. Once residues are fixed, bundles all have
 * equal value, so allocating them in policy order is optimal for that vector.
 * Comparing those candidates gives a global optimum. Work is bounded by 800 * 4
 * and scratch space by the four denominations; no amount-sized table is needed.
 */
final class ExactDenominationPlanner {
    // Descending value order also defines the lexicographic conservation objective.
    private static final NoteDenomination[] DENOMINATIONS = {
            NoteDenomination.TWO_THOUSAND, NoteDenomination.FIVE_HUNDRED,
            NoteDenomination.TWO_HUNDRED, NoteDenomination.ONE_HUNDRED
    };
    private static final int BUNDLE_VALUE = 2000;

    private final int[] inventory = new int[DENOMINATIONS.length];
    private final int[] residues = new int[DENOMINATIONS.length];
    private final DispenseMode mode;
    private int[] best;

    private ExactDenominationPlanner(int amount, Map<NoteDenomination, Integer> available,
                                     DispenseMode mode) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than 0");
        }
        if (amount % 100 != 0) {
            throw new InsufficientCashException("Amount must be a multiple of ₹100");
        }
        if (available == null) {
            throw new IllegalArgumentException("Note inventory is required");
        }
        for (Map.Entry<NoteDenomination, Integer> entry : available.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null || entry.getValue() < 0) {
                throw new IllegalArgumentException("Inventory requires denominations with non-negative counts");
            }
        }
        for (int i = 0; i < DENOMINATIONS.length; i++) {
            inventory[i] = available.getOrDefault(DENOMINATIONS[i], 0);
        }
        this.mode = mode;
    }

    static Map<NoteDenomination, Integer> calculate(int amount, Map<NoteDenomination, Integer> available,
                                                   DispenseMode mode) {
        ExactDenominationPlanner planner = new ExactDenominationPlanner(amount, available, mode);
        planner.searchResidues(0, amount);
        if (planner.best == null) {
            throw new InsufficientCashException("Cannot dispense exact amount ₹" + amount
                    + " using available note denominations");
        }
        Map<NoteDenomination, Integer> result = new LinkedHashMap<>();
        for (int step = 0; step < DENOMINATIONS.length; step++) {
            int i = mode == DispenseMode.MINIMIZE_NOTES ? step : DENOMINATIONS.length - 1 - step;
            if (planner.best[i] > 0) {
                result.put(DENOMINATIONS[i], planner.best[i]);
            }
        }
        return result;
    }

    private void searchResidues(int index, int remaining) {
        if (index == DENOMINATIONS.length) {
            if (remaining % BUNDLE_VALUE == 0) {
                considerBundles(remaining / BUNDLE_VALUE);
            }
            return;
        }
        int value = DENOMINATIONS[index].getValue();
        int maxResidue = Math.min(inventory[index], Math.min(BUNDLE_VALUE / value - 1, remaining / value));
        for (int count = 0; count <= maxResidue; count++) {
            residues[index] = count;
            searchResidues(index + 1, remaining - count * value);
        }
    }

    private void considerBundles(int needed) {
        int[] candidate = residues.clone();
        for (int step = 0; step < DENOMINATIONS.length; step++) {
            int i = mode == DispenseMode.MINIMIZE_NOTES ? step : DENOMINATIONS.length - 1 - step;
            int bundleSize = BUNDLE_VALUE / DENOMINATIONS[i].getValue();
            int take = Math.min(needed, (inventory[i] - residues[i]) / bundleSize);
            // take is bounded by amount / ₹2000, so multiplication/addition fit in int.
            candidate[i] += take * bundleSize;
            needed -= take;
        }
        if (needed == 0 && isBetter(candidate)) {
            best = candidate;
        }
    }

    private boolean isBetter(int[] candidate) {
        if (best == null) {
            return true;
        }
        if (mode == DispenseMode.MINIMIZE_NOTES) {
            int difference = 0;
            for (int i = 0; i < DENOMINATIONS.length; i++) {
                difference += candidate[i] - best[i];
            }
            if (difference != 0) {
                return difference < 0;
            }
        }
        // Conservation minimizes largest-note use first; minimum-note ties prefer larger notes.
        for (int i = 0; i < DENOMINATIONS.length; i++) {
            if (candidate[i] != best[i]) {
                return mode == DispenseMode.MINIMIZE_NOTES
                        ? candidate[i] > best[i] : candidate[i] < best[i];
            }
        }
        return false;
    }
}
