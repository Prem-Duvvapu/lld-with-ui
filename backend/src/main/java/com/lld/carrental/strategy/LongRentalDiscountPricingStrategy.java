package com.lld.carrental.strategy;

import com.lld.carrental.model.VehicleType;
import org.springframework.stereotype.Component;

/** Top tier: 7+ day rentals earn a 20% discount off the daily rate. */
@Component
public class LongRentalDiscountPricingStrategy implements PricingStrategy {

    public static final double DISCOUNT = 0.20;

    @Override
    public String getName() {
        return "LONG_RENTAL_DISCOUNT";
    }

    @Override
    public double calculateCost(VehicleType vehicleType, long days) {
        double cost = vehicleType.getBaseDailyRate() * days * (1 - DISCOUNT);
        return Math.round(cost * 100.0) / 100.0;
    }
}
