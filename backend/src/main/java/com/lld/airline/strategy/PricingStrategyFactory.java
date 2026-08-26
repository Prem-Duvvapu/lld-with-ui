package com.lld.airline.strategy;

import com.lld.airline.enums.PricingModel;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link PricingModel} to its {@link PricingStrategy} via an EnumMap built once —
 * the same shape as {@code inventory.strategy.ReorderStrategyFactory}. Adding a pricing model
 * is one enum constant, one implementation, one put.
 *
 * <p>Explicitly named: {@code com.lld.carrental.strategy.PricingStrategyFactory} and
 * {@code com.lld.parkinglot.strategy.PricingStrategyFactory} share this exact simple class name,
 * and Spring's default bean-name generator (decapitalized simple name) would otherwise collide
 * across all three in the single shared {@code com.lld} component scan (see RCA-023, RCA-024).
 */
@Component("airlinePricingStrategyFactory")
public class PricingStrategyFactory {

    private final Map<PricingModel, PricingStrategy> strategies = new EnumMap<>(PricingModel.class);

    public PricingStrategyFactory(ClassBasedPricingStrategy standard, DemandSurgePricingStrategy surge) {
        strategies.put(PricingModel.STANDARD, standard);
        strategies.put(PricingModel.DEMAND_SURGE, surge);
    }

    public PricingStrategy forModel(PricingModel model) {
        PricingStrategy strategy = strategies.get(model != null ? model : PricingModel.STANDARD);
        return strategy != null ? strategy : strategies.get(PricingModel.STANDARD);
    }
}
