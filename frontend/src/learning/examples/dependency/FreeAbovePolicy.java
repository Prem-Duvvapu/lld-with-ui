package com.lld.learning.examples.dependency;

public final class FreeAbovePolicy implements FeePolicy {
    private final int thresholdCents;
    private final int feeCents;

    public FreeAbovePolicy(int thresholdCents, int feeCents) {
        if (thresholdCents <= 0) throw new IllegalArgumentException("Threshold must be positive");
        if (feeCents < 0) throw new IllegalArgumentException("Fee must be nonnegative");
        this.thresholdCents = thresholdCents;
        this.feeCents = feeCents;
    }

    @Override
    public int feeCents(int subtotalCents) {
        if (subtotalCents < 0) throw new IllegalArgumentException("Subtotal must be nonnegative");
        return subtotalCents >= thresholdCents ? 0 : feeCents;
    }
}
