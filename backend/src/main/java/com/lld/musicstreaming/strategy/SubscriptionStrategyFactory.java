package com.lld.musicstreaming.strategy;

import com.lld.musicstreaming.model.SubscriptionPlan;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves a {@link SubscriptionPlan} to its {@link SubscriptionStrategy}. A new tier
 * (e.g. Student) is a new implementation registered here — nothing calling
 * {@code getStrategy} changes. Mirrors {@code splitwise.strategy.SplitStrategyFactory}.
 */
@Component
public class SubscriptionStrategyFactory {

    private final Map<SubscriptionPlan, SubscriptionStrategy> strategies = new EnumMap<>(SubscriptionPlan.class);

    public SubscriptionStrategyFactory() {
        strategies.put(SubscriptionPlan.FREE, new FreeSubscriptionStrategy());
        strategies.put(SubscriptionPlan.PREMIUM, new PremiumSubscriptionStrategy());
        strategies.put(SubscriptionPlan.FAMILY, new FamilySubscriptionStrategy());
    }

    public SubscriptionStrategy getStrategy(SubscriptionPlan plan) {
        SubscriptionStrategy strategy = strategies.get(plan);
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported subscription plan: " + plan);
        }
        return strategy;
    }
}
