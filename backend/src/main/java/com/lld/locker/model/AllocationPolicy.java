package com.lld.locker.model;

/** Which {@link com.lld.locker.strategy.LockerAllocationStrategy} a deposit resolves to. */
public enum AllocationPolicy {
    /** Picks the smallest empty locker that still fits the package — minimizes wasted space. */
    SMALLEST_FIT,
    /** Picks the first empty locker (scan order) that fits — can waste a larger locker on a small package. */
    FIRST_FIT
}
