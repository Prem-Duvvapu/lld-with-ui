package com.lld.musicstreaming.model;

/**
 * The three tiers {@link com.lld.musicstreaming.strategy.SubscriptionStrategyFactory}
 * resolves into a concrete {@link com.lld.musicstreaming.strategy.SubscriptionStrategy}.
 */
public enum SubscriptionPlan {
    FREE,
    PREMIUM,
    FAMILY
}
