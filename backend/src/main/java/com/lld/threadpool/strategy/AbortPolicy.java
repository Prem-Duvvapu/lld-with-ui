package com.lld.threadpool.strategy;

/** The JDK default: reject loudly. The pool throws {@code TaskRejectedException} rather than
 *  silently dropping or blocking the submitter. */
public final class AbortPolicy implements RejectionPolicy {
    public static final AbortPolicy INSTANCE = new AbortPolicy();

    private AbortPolicy() {}

    @Override
    public RejectionAction decide() {
        return RejectionAction.ABORT;
    }

    @Override
    public RejectionPolicyType type() {
        return RejectionPolicyType.ABORT;
    }
}
