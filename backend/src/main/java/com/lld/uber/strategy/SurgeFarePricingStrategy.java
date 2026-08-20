package com.lld.uber.strategy;

import com.lld.uber.model.VehicleType;
import org.springframework.stereotype.Component;

/**
 * Standard pricing scaled by a surge multiplier for periods of high demand.
 *
 * <p>The multiplier is settable so the simulation can demonstrate the same trip
 * priced two ways without waiting for real demand to move.
 */
@Component
public class SurgeFarePricingStrategy implements FarePricingStrategy {

    public static final double DEFAULT_MULTIPLIER = 1.8;
    private static final double MIN_MULTIPLIER = 1.0;
    private static final double MAX_MULTIPLIER = 5.0;

    private final StandardFarePricingStrategy standard;
    private volatile double multiplier = DEFAULT_MULTIPLIER;

    public SurgeFarePricingStrategy(StandardFarePricingStrategy standard) {
        this.standard = standard;
    }

    @Override
    public String getName() {
        return "SURGE_" + multiplier + "x";
    }

    @Override
    public double calculateFare(double distanceKm, VehicleType vehicleType) {
        double fare = standard.calculateFare(distanceKm, vehicleType) * multiplier;
        return Math.round(fare * 100.0) / 100.0;
    }

    public double getMultiplier() {
        return multiplier;
    }

    public void setMultiplier(double multiplier) {
        if (multiplier < MIN_MULTIPLIER || multiplier > MAX_MULTIPLIER) {
            throw new IllegalArgumentException(
                    "Surge multiplier must be between " + MIN_MULTIPLIER + " and " + MAX_MULTIPLIER);
        }
        this.multiplier = multiplier;
    }
}
