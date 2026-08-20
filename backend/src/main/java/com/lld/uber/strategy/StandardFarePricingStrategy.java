package com.lld.uber.strategy;

import com.lld.uber.model.VehicleType;
import org.springframework.stereotype.Component;

/** Base fare plus a per-kilometre rate that varies by vehicle class. */
@Component
public class StandardFarePricingStrategy implements FarePricingStrategy {

    public static final double BASE_FARE = 25.0;

    @Override
    public String getName() {
        return "STANDARD";
    }

    @Override
    public double calculateFare(double distanceKm, VehicleType vehicleType) {
        double fare = BASE_FARE + distanceKm * vehicleType.getPerKmRate();
        return Math.round(fare * 100.0) / 100.0;
    }
}
