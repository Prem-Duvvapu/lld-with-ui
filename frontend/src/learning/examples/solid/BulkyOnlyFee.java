package com.lld.learning.examples.solid;

/** Intentionally violates FeePolicy: it rejects weights the contract promises to accept. */
public final class BulkyOnlyFee implements FeePolicy {
    @Override public int feeCents(int weightGrams) {
        StandardFee.requireWeight(weightGrams);
        if (weightGrams <= 1000) throw new IllegalArgumentException("Bulky parcels only");
        return 500;
    }
}
