package com.lld.learning.examples.sequence;

import java.util.Objects;

public final class QuoteDesk {
    public record Result(ParcelFees.Quote quote, String receipt) {
        public boolean accepted() { return quote.accepted(); }
    }

    private final ParcelFees fees;
    private final ReceiptWriter receipts;
    private final InteractionTrace trace;

    public QuoteDesk(ParcelFees fees, ReceiptWriter receipts, InteractionTrace trace) {
        this.fees = Objects.requireNonNull(fees, "fees");
        this.receipts = Objects.requireNonNull(receipts, "receipts");
        this.trace = Objects.requireNonNull(trace, "trace");
    }

    public Result quote(int weightGrams) {
        trace.call("desk", "fees", "quote(" + weightGrams + ")");
        ParcelFees.Quote quote = fees.quote(weightGrams);
        trace.reply("fees", "desk", quote.accepted()
                ? "fee = " + quote.feeCents() + " cents" : "rejected: " + quote.rejection());
        if (!quote.accepted()) return new Result(quote, null);

        trace.call("desk", "receipts", "render(accepted quote)");
        String receipt = receipts.render(quote);
        trace.reply("receipts", "desk", "\"" + receipt + "\"");
        return new Result(quote, receipt);
    }
}
