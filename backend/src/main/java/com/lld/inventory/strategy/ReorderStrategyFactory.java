package com.lld.inventory.strategy;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link ReorderPolicy} to its strategy via an EnumMap built once —
 * the same shape as splitwise's {@code SplitStrategyFactory}. Adding a policy
 * is one enum constant, one implementation, one put.
 */
@Component
public class ReorderStrategyFactory {

    private final Map<ReorderPolicy, ReorderStrategy> strategies = new EnumMap<>(ReorderPolicy.class);

    public ReorderStrategyFactory(MinRestockStrategy min,
                                  EoqReorderStrategy eoq,
                                  UrgentBufferReorderStrategy urgent) {
        strategies.put(ReorderPolicy.MIN_RESTOCK, min);
        strategies.put(ReorderPolicy.EOQ, eoq);
        strategies.put(ReorderPolicy.URGENT_BUFFER, urgent);
    }

    public ReorderStrategy forPolicy(ReorderPolicy policy) {
        return strategies.get(policy);
    }
}
