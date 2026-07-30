package com.lld.parkinglot.strategy;

import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class PricingStrategyFactory {

    private final Map<String, PricingStrategy> strategies;

    public PricingStrategyFactory(HourlyPricingStrategy hourly, FlatRatePricingStrategy flat, DynamicPricingStrategy dynamic) {
        this.strategies = Map.of(
                "HOURLY", hourly,
                "FLAT", flat,
                "DYNAMIC", dynamic
        );
    }

    public PricingStrategy getStrategy(String strategyName) {
        if (strategyName == null || strategyName.isBlank()) {
            return strategies.get("HOURLY");
        }
        PricingStrategy strategy = strategies.get(strategyName.trim().toUpperCase());
        if (strategy == null) {
            throw new IllegalArgumentException("Unknown pricing strategy: " + strategyName);
        }
        return strategy;
    }
}
