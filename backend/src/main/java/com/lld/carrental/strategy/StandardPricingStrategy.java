package com.lld.carrental.strategy;

import com.lld.carrental.model.VehicleType;
import org.springframework.stereotype.Component;

/** Base tier: 1–2 day rentals pay the category's daily rate with no discount. */
@Component
public class StandardPricingStrategy implements PricingStrategy {

    @Override
    public String getName() {
        return "STANDARD";
    }

    @Override
    public double calculateCost(VehicleType vehicleType, long days) {
        double cost = vehicleType.getBaseDailyRate() * days;
        return Math.round(cost * 100.0) / 100.0;
    }
}
