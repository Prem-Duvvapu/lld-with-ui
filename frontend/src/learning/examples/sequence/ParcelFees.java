package com.lld.learning.examples.sequence;

public final class ParcelFees {
    public record Quote(int weightGrams, Integer feeCents, String rejection) {
        public boolean accepted() { return feeCents != null; }
    }

    // A business rejection is a returned value here, not a thrown exception.
    public Quote quote(int weightGrams) {
        if (weightGrams < 1 || weightGrams > 2000) {
            return new Quote(weightGrams, null, "Weight must be 1 to 2000 g");
        }
        return new Quote(weightGrams, weightGrams <= 1000 ? 300 : 500, null);
    }
}
