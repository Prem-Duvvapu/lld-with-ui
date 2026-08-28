package com.lld.parkinglot.strategy;

/** The set of pricing policies a ticket can be charged under, resolved by {@link PricingStrategyFactory}. */
public enum PricingStrategyType {
    HOURLY, FLAT, DYNAMIC
}
