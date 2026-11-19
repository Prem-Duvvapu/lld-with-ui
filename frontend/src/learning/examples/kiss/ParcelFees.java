package com.lld.learning.examples.kiss;

/** The same contract, expressed directly. Amounts are integer cents. */
public final class ParcelFees {
    public int feeCents(int weightGrams) {
        if (weightGrams < 1 || weightGrams > 2000) {
            throw new IllegalArgumentException("weightGrams must be 1..2000");
        }
        if (weightGrams <= 1000) {
            return 300;
        }
        return 500;
    }
}
