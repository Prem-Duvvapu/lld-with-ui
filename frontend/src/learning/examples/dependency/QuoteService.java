package com.lld.learning.examples.dependency;

import java.util.Objects;

/** No collaborator is retained by this service. */
public final class QuoteService {
    public int quote(int subtotalCents, FeePolicy policy) {
        if (subtotalCents < 0) throw new IllegalArgumentException("Subtotal must be nonnegative");
        Objects.requireNonNull(policy, "Policy is required");
        int fee = policy.feeCents(subtotalCents);
        if (fee < 0) throw new IllegalArgumentException("Policy returned a negative fee");
        return Math.addExact(subtotalCents, fee);
    }

    // A local variable still introduces a concrete source dependency.
    public int quoteWithDefault(int subtotalCents) {
        FeePolicy local = new FlatFeePolicy(50);
        return quote(subtotalCents, local);
    }
}
