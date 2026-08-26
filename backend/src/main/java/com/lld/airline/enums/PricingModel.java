package com.lld.airline.enums;

/**
 * The pricing model a flight is priced under at creation time. Resolved to a
 * {@link com.lld.airline.strategy.PricingStrategy} by {@code PricingStrategyFactory}.
 */
public enum PricingModel {
    /** Flat per-class pricing — the same fare for a given {@link SeatClass} regardless of demand. */
    STANDARD,
    /** Demand-based dynamic pricing — {@link SeatClass} base fare scaled by proximity to departure. */
    DEMAND_SURGE
}
