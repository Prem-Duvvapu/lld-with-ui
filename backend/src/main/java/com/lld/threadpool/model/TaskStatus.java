package com.lld.threadpool.model;

/** Lifecycle of one submitted {@link PoolTask}. */
public enum TaskStatus {
    QUEUED,
    RUNNING,
    COMPLETED,
    REJECTED
}
