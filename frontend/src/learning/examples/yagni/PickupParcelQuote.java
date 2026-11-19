package com.lld.learning.examples.yagni;

import java.util.Objects;

/** Later approved requirement: pickup subtracts 100 cents once per valid quote. */
public final class PickupParcelQuote {
    private static final int PICKUP_DISCOUNT_CENTS = 100;
    private final CurrentParcelQuote standard;

    public PickupParcelQuote(CurrentParcelQuote standard) {
        this.standard = Objects.requireNonNull(standard, "standard");
    }

    public int quoteCents(int parcels, boolean pickup) {
        int base = standard.quoteCents(parcels);
        return pickup ? base - PICKUP_DISCOUNT_CENTS : base;
    }
}
