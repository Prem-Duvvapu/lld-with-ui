package com.lld.parkinglot.strategy;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SpotAssignmentStrategyFactory {

    private final Map<String, SpotAssignmentStrategy> strategies;

    public SpotAssignmentStrategyFactory(NearestSpotStrategy nearest, FarthestSpotStrategy farthest) {
        this.strategies = Map.of(
                "NEAREST", nearest,
                "FARTHEST", farthest
        );
    }

    public SpotAssignmentStrategy getStrategy(String strategyName) {
        if (strategyName == null || strategyName.isBlank()) {
            return strategies.get("NEAREST");
        }
        SpotAssignmentStrategy strategy = strategies.get(strategyName.trim().toUpperCase());
        if (strategy == null) {
            throw new IllegalArgumentException("Unknown spot assignment strategy: " + strategyName);
        }
        return strategy;
    }
}
