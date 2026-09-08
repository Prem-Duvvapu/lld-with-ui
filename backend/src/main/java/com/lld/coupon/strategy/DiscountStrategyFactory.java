package com.lld.coupon.strategy;

import com.lld.coupon.model.DiscountType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link DiscountType} to its strategy via an EnumMap built once — the same shape as
 * {@code locker.strategy.LockerAllocationStrategyFactory}.
 */
@Component
public class DiscountStrategyFactory {

    private final Map<DiscountType, DiscountStrategy> strategies = new EnumMap<>(DiscountType.class);

    public DiscountStrategyFactory(PercentageOffStrategy percentageOff, FlatOffStrategy flatOff, BogoStrategy bogo) {
        strategies.put(DiscountType.PERCENTAGE_OFF, percentageOff);
        strategies.put(DiscountType.FLAT_OFF, flatOff);
        strategies.put(DiscountType.BOGO, bogo);
    }

    public DiscountStrategy forType(DiscountType type) {
        DiscountStrategy strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("No DiscountStrategy registered for type " + type);
        }
        return strategy;
    }
}
