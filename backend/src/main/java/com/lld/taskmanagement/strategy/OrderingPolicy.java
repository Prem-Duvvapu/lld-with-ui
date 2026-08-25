package com.lld.taskmanagement.strategy;

public enum OrderingPolicy {
    /** Highest priority first; ties broken by creation order (first-in-first-out). */
    FIFO_PRIORITY,
    /** Earliest due date first (no-due-date tasks sort last); ties broken by priority, then FIFO. */
    DUE_DATE_FIRST,
    /** Priority weight plus an urgency bonus for a deadline close to creation time. */
    WEIGHTED_SCORE
}
