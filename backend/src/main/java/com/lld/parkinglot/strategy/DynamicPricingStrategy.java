package com.lld.parkinglot.strategy;

import com.lld.parkinglot.model.Ticket;
import org.springframework.stereotype.Component;

@Component("dynamicPricingStrategy")
public class DynamicPricingStrategy implements PricingStrategy {

    private final HourlyPricingStrategy baseStrategy = new HourlyPricingStrategy();
    private static final double SURCHARGE_MULTIPLIER = 1.5;

    @Override
    public double calculatePrice(Ticket ticket) {
        double basePrice = baseStrategy.calculatePrice(ticket);
        return basePrice * SURCHARGE_MULTIPLIER;
    }
}
