package com.lld.auction.strategy;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link BidIncrementPolicy} to its strategy via an {@link EnumMap} built once — the
 * same shape as inventory's {@code ReorderStrategyFactory} and splitwise's
 * {@code SplitStrategyFactory}. Adding a policy is one enum constant, one implementation, one put.
 */
@Component
public class BidIncrementStrategyFactory {

    private final Map<BidIncrementPolicy, BidIncrementStrategy> strategies = new EnumMap<>(BidIncrementPolicy.class);

    public BidIncrementStrategyFactory(FixedIncrementStrategy fixed, PercentageIncrementStrategy percentage) {
        strategies.put(BidIncrementPolicy.FIXED, fixed);
        strategies.put(BidIncrementPolicy.PERCENTAGE, percentage);
    }

    public BidIncrementStrategy forPolicy(BidIncrementPolicy policy) {
        return strategies.get(policy);
    }
}
