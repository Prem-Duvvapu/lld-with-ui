package com.lld.threadpool.strategy;

/** What {@link RejectionPolicy#decide()} tells {@link com.lld.threadpool.model.CustomThreadPool}
 *  to do with a task that arrived while the pool is fully saturated. */
public enum RejectionAction {
    ABORT,
    CALLER_RUNS,
    DISCARD,
    DISCARD_OLDEST
}
