package com.lld.carrental.strategy;

import org.springframework.stereotype.Component;

/**
 * Resolves the tiered pricing strategy for a rental's duration.
 *
 * <p>1–2 days: {@link StandardPricingStrategy}. 3–6 days: {@link WeeklyDiscountPricingStrategy}
 * (10% off). 7+ days: {@link LongRentalDiscountPricingStrategy} (20% off). Adding a new tier is
 * one new {@code PricingStrategy} implementation plus one line here — {@code CarRentalService}
 * never branches on duration itself.
 */
// Explicit bean name: parkinglot also has a (differently-shaped) PricingStrategyFactory,
// and Spring's default simple-class-name bean naming would collide across the two packages.
@Component("carRentalPricingStrategyFactory")
public class PricingStrategyFactory {

    private final StandardPricingStrategy standard;
    private final WeeklyDiscountPricingStrategy weeklyDiscount;
    private final LongRentalDiscountPricingStrategy longRentalDiscount;

    public PricingStrategyFactory(StandardPricingStrategy standard,
                                   WeeklyDiscountPricingStrategy weeklyDiscount,
                                   LongRentalDiscountPricingStrategy longRentalDiscount) {
        this.standard = standard;
        this.weeklyDiscount = weeklyDiscount;
        this.longRentalDiscount = longRentalDiscount;
    }

    public PricingStrategy forDuration(long days) {
        if (days >= 7) {
            return longRentalDiscount;
        }
        if (days >= 3) {
            return weeklyDiscount;
        }
        return standard;
    }
}
