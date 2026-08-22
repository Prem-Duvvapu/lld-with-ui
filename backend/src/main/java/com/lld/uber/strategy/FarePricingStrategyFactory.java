package com.lld.uber.strategy;

import org.springframework.stereotype.Component;

/** Resolves the pricing strategy for a request, defaulting to standard rates. */
@Component
public class FarePricingStrategyFactory {

    private final StandardFarePricingStrategy standard;
    private final SurgeFarePricingStrategy surge;

    public FarePricingStrategyFactory(StandardFarePricingStrategy standard, SurgeFarePricingStrategy surge) {
        this.standard = standard;
        this.surge = surge;
    }

    /** @param surgeActive whether demand pricing applies to this request */
    public FarePricingStrategy forDemand(boolean surgeActive) {
        return surgeActive ? surge : standard;
    }

    public StandardFarePricingStrategy standard() {
        return standard;
    }

    public SurgeFarePricingStrategy surge() {
        return surge;
    }
}
