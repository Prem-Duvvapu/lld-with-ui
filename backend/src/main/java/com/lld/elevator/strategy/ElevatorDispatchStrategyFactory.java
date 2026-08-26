package com.lld.elevator.strategy;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link DispatchPolicy} to its strategy via an EnumMap built once — the same shape as
 * {@code inventory.strategy.ReorderStrategyFactory}. Adding a policy is one enum constant, one
 * implementation, one put.
 */
@Component
public class ElevatorDispatchStrategyFactory {

    private final Map<DispatchPolicy, ElevatorDispatchStrategy> strategies = new EnumMap<>(DispatchPolicy.class);

    public ElevatorDispatchStrategyFactory(LookScanDispatchStrategy lookScan, NearestCarDispatchStrategy nearestCar) {
        strategies.put(DispatchPolicy.LOOK_SCAN, lookScan);
        strategies.put(DispatchPolicy.NEAREST_CAR, nearestCar);
    }

    public ElevatorDispatchStrategy forPolicy(DispatchPolicy policy) {
        ElevatorDispatchStrategy strategy = strategies.get(policy);
        if (strategy == null) {
            throw new IllegalArgumentException("No ElevatorDispatchStrategy registered for policy " + policy);
        }
        return strategy;
    }
}
