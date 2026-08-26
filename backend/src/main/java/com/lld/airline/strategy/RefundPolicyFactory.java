package com.lld.airline.strategy;

import com.lld.airline.enums.FareType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/**
 * Resolves {@link FareType} to its {@link RefundPolicy} via an EnumMap built once —
 * the same shape as {@code inventory.strategy.ReorderStrategyFactory}. Adding a fare family
 * is one enum constant, one policy, one put.
 *
 * <p>Explicitly named as a precaution against the exact class of bug fixed for
 * {@link PricingStrategyFactory} in this same package (RCA-024): a same-simple-name
 * {@code @Component} anywhere else in {@code com.lld} would silently collide bean names.
 */
@Component("airlineRefundPolicyFactory")
public class RefundPolicyFactory {

    private final Map<FareType, RefundPolicy> policies = new EnumMap<>(FareType.class);

    public RefundPolicyFactory(TieredCancellationRefundPolicy flexible, NonRefundableFarePolicy basic) {
        policies.put(FareType.FLEXIBLE, flexible);
        policies.put(FareType.BASIC, basic);
    }

    public RefundPolicy forFareType(FareType fareType) {
        RefundPolicy policy = policies.get(fareType != null ? fareType : FareType.FLEXIBLE);
        return policy != null ? policy : policies.get(FareType.FLEXIBLE);
    }
}
