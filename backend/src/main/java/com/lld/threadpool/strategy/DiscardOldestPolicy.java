package com.lld.threadpool.strategy;

/** Evicts the longest-waiting queued task to make room for the new one — favors freshness over
 *  fairness, on the theory that a task that's been queued the longest is also the most likely to
 *  be stale by the time it would run. */
public final class DiscardOldestPolicy implements RejectionPolicy {
    public static final DiscardOldestPolicy INSTANCE = new DiscardOldestPolicy();

    private DiscardOldestPolicy() {}

    @Override
    public RejectionAction decide() {
        return RejectionAction.DISCARD_OLDEST;
    }

    @Override
    public RejectionPolicyType type() {
        return RejectionPolicyType.DISCARD_OLDEST;
    }
}
