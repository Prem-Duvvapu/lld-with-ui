package com.lld.threadpool.strategy;

import org.springframework.stereotype.Component;

/** Resolves a {@link RejectionPolicyType} to its stateless singleton instance. */
@Component
public class RejectionPolicyFactory {

    public RejectionPolicy create(RejectionPolicyType type) {
        return switch (type) {
            case ABORT -> AbortPolicy.INSTANCE;
            case CALLER_RUNS -> CallerRunsPolicy.INSTANCE;
            case DISCARD -> DiscardPolicy.INSTANCE;
            case DISCARD_OLDEST -> DiscardOldestPolicy.INSTANCE;
        };
    }
}
