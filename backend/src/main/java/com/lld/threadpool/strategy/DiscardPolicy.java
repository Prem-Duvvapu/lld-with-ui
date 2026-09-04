package com.lld.threadpool.strategy;

/** Silently drops the incoming task. No exception, no side effect — the caller sees a 200
 *  {@code SubmitResult} with outcome {@code DISCARDED}, not a failure. */
public final class DiscardPolicy implements RejectionPolicy {
    public static final DiscardPolicy INSTANCE = new DiscardPolicy();

    private DiscardPolicy() {}

    @Override
    public RejectionAction decide() {
        return RejectionAction.DISCARD;
    }

    @Override
    public RejectionPolicyType type() {
        return RejectionPolicyType.DISCARD;
    }
}
