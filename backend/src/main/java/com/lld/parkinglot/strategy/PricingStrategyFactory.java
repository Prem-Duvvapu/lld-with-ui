package com.lld.parkinglot.strategy;

import com.lld.parkinglot.exception.InvalidParkingRequestException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link PricingStrategyType} to its strategy via an EnumMap built once — the same shape
 * as {@code inventory.strategy.ReorderStrategyFactory}. The service never branches on the policy
 * itself; it only ever calls {@link #getStrategy}. Adding a pricing model is one enum constant,
 * one implementation, one put.
 */
@Component
public class PricingStrategyFactory {

    private final Map<PricingStrategyType, PricingStrategy> strategies = new EnumMap<>(PricingStrategyType.class);

    public PricingStrategyFactory(HourlyPricingStrategy hourly, FlatRatePricingStrategy flat, DynamicPricingStrategy dynamic) {
        strategies.put(PricingStrategyType.HOURLY, hourly);
        strategies.put(PricingStrategyType.FLAT, flat);
        strategies.put(PricingStrategyType.DYNAMIC, dynamic);
    }

    public PricingStrategy getStrategy(String strategyName) {
        if (strategyName == null || strategyName.isBlank()) {
            return strategies.get(PricingStrategyType.HOURLY);
        }
        PricingStrategyType type;
        try {
            type = PricingStrategyType.valueOf(strategyName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidParkingRequestException("Unknown pricing strategy: " + strategyName);
        }
        return strategies.get(type);
    }
}
