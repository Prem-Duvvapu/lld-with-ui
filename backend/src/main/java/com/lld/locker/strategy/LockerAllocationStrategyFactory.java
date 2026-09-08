package com.lld.locker.strategy;

import com.lld.locker.model.AllocationPolicy;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link AllocationPolicy} to its strategy via an EnumMap built once — the same shape
 * as {@code inventory.strategy.ReorderStrategyFactory}. Adding a policy is one enum constant,
 * one implementation, one put.
 */
@Component
public class LockerAllocationStrategyFactory {

    private final Map<AllocationPolicy, LockerAllocationStrategy> strategies = new EnumMap<>(AllocationPolicy.class);

    public LockerAllocationStrategyFactory(SmallestFitFirstAllocationStrategy smallestFit,
                                            FirstFitAllocationStrategy firstFit) {
        strategies.put(AllocationPolicy.SMALLEST_FIT, smallestFit);
        strategies.put(AllocationPolicy.FIRST_FIT, firstFit);
    }

    public LockerAllocationStrategy forPolicy(AllocationPolicy policy) {
        LockerAllocationStrategy strategy = strategies.get(policy);
        if (strategy == null) {
            throw new IllegalArgumentException("No LockerAllocationStrategy registered for policy " + policy);
        }
        return strategy;
    }
}
