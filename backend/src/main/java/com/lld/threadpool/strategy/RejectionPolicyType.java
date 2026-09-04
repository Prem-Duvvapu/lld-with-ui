package com.lld.threadpool.strategy;

public enum RejectionPolicyType {
    ABORT,
    CALLER_RUNS,
    DISCARD,
    DISCARD_OLDEST
}
