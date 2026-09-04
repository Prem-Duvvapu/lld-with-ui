package com.lld.threadpool.model;

import com.lld.threadpool.strategy.RejectionPolicyType;

/** Construction/resize parameters for a {@link CustomThreadPool}. */
public record PoolConfig(
        int corePoolSize,
        int maxPoolSize,
        int queueCapacity,
        long keepAliveMillis,
        RejectionPolicyType rejectionPolicyType
) {
}
