package com.lld.atm.dispenser;

/**
 * Which {@link DenominationDispenseStrategy} a dispense request resolves to, mirroring the
 * enum + factory shape of {@code com.lld.inventory.strategy.ReorderPolicy} /
 * {@code ReorderStrategyFactory}.
 */
public enum DispenseMode {
    /** Fewest possible notes handed to the customer: largest denomination first. */
    MINIMIZE_NOTES,
    /** Preserve the high-value note reserve for future large withdrawals: smallest first. */
    CONSERVE_LARGE_NOTES
}
