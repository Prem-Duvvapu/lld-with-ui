package com.lld.uber.strategy;

import com.lld.uber.model.VehicleType;

/**
 * Strategy for turning a trip into a fare.
 *
 * <p>Pricing used to be a `switch (vehicleType)` inlined twice inside UberService —
 * once in estimate() and once in requestRide() — which is exactly how the two drifted
 * apart. One implementation, one call site each.
 */
public interface FarePricingStrategy {

    /** Identifier surfaced to the UI and the simulation event log. */
    String getName();

    /**
     * @param distanceKm trip distance
     * @param vehicleType vehicle class being priced
     * @return total fare, rounded to paise
     */
    double calculateFare(double distanceKm, VehicleType vehicleType);
}
