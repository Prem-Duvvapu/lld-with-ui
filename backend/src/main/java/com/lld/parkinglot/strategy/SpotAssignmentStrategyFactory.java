package com.lld.parkinglot.strategy;

import com.lld.parkinglot.exception.InvalidParkingRequestException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link SpotAssignmentStrategyType} to its strategy via an EnumMap built once — the
 * same shape as {@code inventory.strategy.ReorderStrategyFactory}. The service never branches on
 * the policy itself; it only ever calls {@link #getStrategy}.
 */
@Component
public class SpotAssignmentStrategyFactory {

    private final Map<SpotAssignmentStrategyType, SpotAssignmentStrategy> strategies = new EnumMap<>(SpotAssignmentStrategyType.class);

    public SpotAssignmentStrategyFactory(NearestSpotStrategy nearest, FarthestSpotStrategy farthest) {
        strategies.put(SpotAssignmentStrategyType.NEAREST, nearest);
        strategies.put(SpotAssignmentStrategyType.FARTHEST, farthest);
    }

    public SpotAssignmentStrategy getStrategy(String strategyName) {
        if (strategyName == null || strategyName.isBlank()) {
            return strategies.get(SpotAssignmentStrategyType.NEAREST);
        }
        SpotAssignmentStrategyType type;
        try {
            type = SpotAssignmentStrategyType.valueOf(strategyName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidParkingRequestException("Unknown spot assignment strategy: " + strategyName);
        }
        return strategies.get(type);
    }
}
