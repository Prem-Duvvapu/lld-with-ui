package com.lld.threadpool.model;

/**
 * What happened to a task handed to {@link CustomThreadPool#submit}. There is no {@code ABORTED}
 * value: {@link com.lld.threadpool.strategy.AbortPolicy} throws
 * {@link com.lld.threadpool.exception.TaskRejectedException} instead of returning an outcome, so a
 * client never sees a 200 body for that case.
 */
public enum SubmitOutcome {
    /** Assigned to a core worker, queued, or assigned to a newly-spun-up extra worker. */
    ACCEPTED,
    /** {@link com.lld.threadpool.strategy.DiscardPolicy} fired — silently dropped, never runs. */
    DISCARDED,
    /** {@link com.lld.threadpool.strategy.CallerRunsPolicy} fired — ran synchronously on the submitting thread, no pool worker involved. */
    RAN_ON_CALLER
}
