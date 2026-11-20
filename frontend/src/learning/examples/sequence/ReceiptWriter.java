package com.lld.learning.examples.sequence;

import java.util.Objects;

/** A quote receipt is just returned text; no money is collected or printed. */
public final class ReceiptWriter {
    public String render(ParcelFees.Quote quote) {
        Objects.requireNonNull(quote, "quote");
        if (!quote.accepted()) throw new IllegalArgumentException("An accepted quote is required");
        return "Parcel " + quote.weightGrams() + " g: " + quote.feeCents() + " cents";
    }
}
