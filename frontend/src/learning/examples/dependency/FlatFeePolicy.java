package com.lld.learning.examples.dependency;

public final class FlatFeePolicy implements FeePolicy {
    private final int feeCents;

    public FlatFeePolicy(int feeCents) {
        if (feeCents < 0) throw new IllegalArgumentException("Fee must be nonnegative");
        this.feeCents = feeCents;
    }

    @Override
    public int feeCents(int subtotalCents) {
        if (subtotalCents < 0) throw new IllegalArgumentException("Subtotal must be nonnegative");
        return feeCents;
    }
}
