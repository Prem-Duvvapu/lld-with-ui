package com.lld.learning.examples.sequence;

import java.util.Objects;

/** The caller is this object, not the QuoteClient class or a human actor. */
public final class QuoteClient {
    private final QuoteDesk desk;
    private final InteractionTrace trace;

    public QuoteClient(QuoteDesk desk, InteractionTrace trace) {
        this.desk = Objects.requireNonNull(desk, "desk");
        this.trace = Objects.requireNonNull(trace, "trace");
    }

    public QuoteDesk.Result request(int weightGrams) {
        trace.call("client", "desk", "quote(" + weightGrams + ")");
        QuoteDesk.Result result = desk.quote(weightGrams);
        trace.reply("desk", "client", result.accepted() ? "accepted result" : "rejected result");
        return result;
    }
}
