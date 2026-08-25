package com.lld.taskmanagement.strategy;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link OrderingPolicy} to its strategy via an {@link EnumMap} built once — the same
 * shape as {@code inventory.strategy.ReorderStrategyFactory} and
 * {@code splitwise.strategy.SplitStrategyFactory}. Adding a policy is one enum constant, one
 * implementation, one put; {@code TaskService} never branches on the policy itself.
 */
@Component
public class TaskOrderingStrategyFactory {

    private final Map<OrderingPolicy, TaskOrderingStrategy> strategies = new EnumMap<>(OrderingPolicy.class);

    public TaskOrderingStrategyFactory(FifoWithinPriorityStrategy fifoWithinPriority,
                                       DueDateFirstStrategy dueDateFirst,
                                       WeightedScoreStrategy weightedScore) {
        strategies.put(OrderingPolicy.FIFO_PRIORITY, fifoWithinPriority);
        strategies.put(OrderingPolicy.DUE_DATE_FIRST, dueDateFirst);
        strategies.put(OrderingPolicy.WEIGHTED_SCORE, weightedScore);
    }

    public TaskOrderingStrategy forPolicy(OrderingPolicy policy) {
        return strategies.get(policy);
    }
}
