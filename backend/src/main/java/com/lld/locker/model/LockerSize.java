package com.lld.locker.model;

/**
 * Ordinal order matters: {@link com.lld.locker.strategy.SmallestFitFirstAllocationStrategy} and
 * {@link com.lld.locker.strategy.FirstFitAllocationStrategy} both compare sizes via
 * {@code ordinal()} to decide whether a locker is big enough for a package.
 */
public enum LockerSize {
    SMALL,
    MEDIUM,
    LARGE;

    public boolean fits(LockerSize required) {
        return this.ordinal() >= required.ordinal();
    }
}
