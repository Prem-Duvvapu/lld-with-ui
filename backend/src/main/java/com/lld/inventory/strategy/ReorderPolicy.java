package com.lld.inventory.strategy;

/** The reorder policies the buyer can pick from; resolved to a strategy by the factory. */
public enum ReorderPolicy {
    /** Order just enough to climb back to the reorder level. */
    MIN_RESTOCK,
    /** Economic Order Quantity — classic sqrt(2DS/H) lot-size formula. */
    EOQ,
    /** Big buffer after a stock-out; standard top-up otherwise. */
    URGENT_BUFFER
}
