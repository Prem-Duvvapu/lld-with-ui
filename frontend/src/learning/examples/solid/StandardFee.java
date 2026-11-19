package com.lld.learning.examples.solid;

public final class StandardFee implements FeePolicy {
    static void requireWeight(int weightGrams) {
        if (weightGrams < 1 || weightGrams > 2000) {
            throw new IllegalArgumentException("weightGrams must be 1..2000");
        }
    }

    @Override public int feeCents(int weightGrams) {
        requireWeight(weightGrams);
        return weightGrams <= 1000 ? 300 : 500;
    }
}
