package com.lld.carrental.strategy;

import com.lld.carrental.model.VehicleType;
import org.springframework.stereotype.Component;

/** Mid tier: 3–6 day rentals earn a 10% discount off the daily rate. */
@Component
public class WeeklyDiscountPricingStrategy implements PricingStrategy {

    public static final double DISCOUNT = 0.10;

    @Override
    public String getName() {
        return "WEEKLY_DISCOUNT";
    }

    @Override
    public double calculateCost(VehicleType vehicleType, long days) {
        double cost = vehicleType.getBaseDailyRate() * days * (1 - DISCOUNT);
        return Math.round(cost * 100.0) / 100.0;
    }
}
