package com.lld.learning.examples.dependency;

import java.util.Objects;

/** Constructor injection plus a stored association; neither specifies ownership. */
public final class QuoteSession {
    private final FeePolicy policy;

    public QuoteSession(FeePolicy policy) {
        this.policy = Objects.requireNonNull(policy, "Policy is required");
    }

    public FeePolicy getPolicy() {
        return policy;
    }

    public int quote(int subtotalCents) {
        return new QuoteService().quote(subtotalCents, policy);
    }
}
