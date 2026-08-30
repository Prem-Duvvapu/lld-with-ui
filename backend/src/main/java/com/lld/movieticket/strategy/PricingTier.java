package com.lld.movieticket.strategy;

/** Which {@link PricingStrategy} a show's pricing falls under. */
public enum PricingTier {
    /** Regular daytime shows — base seat-type pricing, no surcharge. */
    STANDARD,
    /** Evening/peak-demand shows — {@link SurgePricingStrategy}'s multiplier applies. */
    PEAK
}
