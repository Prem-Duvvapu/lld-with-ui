package com.lld.learning.examples.solid;

import java.util.Objects;

/** A 100-cent reduction, floored at zero, over a conforming base policy. */
public final class PickupFee implements FeePolicy {
    private final FeePolicy base;

    public PickupFee(FeePolicy base) {
        this.base = Objects.requireNonNull(base, "base");
    }

    @Override public int feeCents(int weightGrams) {
        StandardFee.requireWeight(weightGrams);
        return Math.max(0, base.feeCents(weightGrams) - 100);
    }
}
