package com.lld.learning.examples.yagni;

/** Current requirement: 200 cents per parcel, for 1 through 20 parcels. */
public final class CurrentParcelQuote {
    private static final int CENTS_PER_PARCEL = 200;

    public int quoteCents(int parcels) {
        if (parcels < 1 || parcels > 20) {
            throw new IllegalArgumentException("parcels must be between 1 and 20");
        }
        return parcels * CENTS_PER_PARCEL;
    }
}
