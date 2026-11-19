package com.lld.learning.examples.solid;

/** An approved additional policy: valid parcels are free, invalid weights still reject. */
public final class FreeFee implements FeePolicy {
    @Override public int feeCents(int weightGrams) {
        StandardFee.requireWeight(weightGrams);
        return 0;
    }
}
