package com.lld.atm.dispenser;

/**
 * Which {@link DenominationDispenseStrategy} a dispense request resolves to, mirroring the
 * enum + factory shape of {@code com.lld.inventory.strategy.ReorderPolicy} /
 * {@code ReorderStrategyFactory}.
 */
public enum DispenseMode {
    /** Fewest possible notes in an exact feasible plan; ties prefer larger denominations. */
    MINIMIZE_NOTES,
    /** Minimize usage of ₹2000, then ₹500, then ₹200 notes among exact feasible plans. */
    CONSERVE_LARGE_NOTES
}
