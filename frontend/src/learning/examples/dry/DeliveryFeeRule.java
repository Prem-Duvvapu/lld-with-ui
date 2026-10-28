package com.lld.learning.examples.dry;

/** One fee rule for a nonnegative subtotal in integer cents; no tax or payment. */
public final class DeliveryFeeRule {
    private final int freeFromCents;
    private final int standardFeeCents;

    public DeliveryFeeRule(int freeFromCents, int standardFeeCents) {
        if (freeFromCents <= 0) throw new IllegalArgumentException("Threshold must be positive");
        if (standardFeeCents < 0) throw new IllegalArgumentException("Negative fee");
        this.freeFromCents = freeFromCents;
        this.standardFeeCents = standardFeeCents;
    }

    public int feeCents(int subtotalCents) {
        if (subtotalCents < 0) throw new IllegalArgumentException("Negative subtotal");
        return subtotalCents >= freeFromCents ? 0 : standardFeeCents;
    }
}
