package com.lld.threadpool.strategy;

/**
 * Strategy interface for what happens to a task {@link com.lld.threadpool.model.CustomThreadPool}
 * cannot accept through its normal core-worker / queue / extra-worker path (all core+extra workers
 * busy AND the queue is full). Every implementation is a stateless singleton — the decision never
 * depends on which task arrived, only on which policy the pool was configured with — mirroring how
 * {@code trafficsignal.state.SignalState}'s states are singletons.
 */
public interface RejectionPolicy {
    RejectionAction decide();

    RejectionPolicyType type();
}
