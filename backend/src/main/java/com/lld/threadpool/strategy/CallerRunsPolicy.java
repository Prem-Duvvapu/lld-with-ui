package com.lld.threadpool.strategy;

/** Backpressure without loss: the submitting thread runs the task itself, synchronously, using no
 *  pool worker at all. Naturally throttles a bursty caller, since it can't submit its next task
 *  until this one finishes. */
public final class CallerRunsPolicy implements RejectionPolicy {
    public static final CallerRunsPolicy INSTANCE = new CallerRunsPolicy();

    private CallerRunsPolicy() {}

    @Override
    public RejectionAction decide() {
        return RejectionAction.CALLER_RUNS;
    }

    @Override
    public RejectionPolicyType type() {
        return RejectionPolicyType.CALLER_RUNS;
    }
}
