package com.lld.carrental.strategy;

import com.lld.carrental.model.VehicleType;

/**
 * Strategy for turning a vehicle category and rental duration into a total cost.
 *
 * <p>Rates vary by tier (the category's base daily rate, see {@link VehicleType}) and by how
 * long the rental runs — a longer rental earns a per-day discount. {@link PricingStrategyFactory}
 * resolves which tier of discount applies; this interface is what lets a new tier be added
 * without touching {@code CarRentalService}.
 */
public interface PricingStrategy {

    /** Identifier surfaced to the UI and the reservation record. */
    String getName();

    /**
     * @param vehicleType category being priced
     * @param days        length of the rental, inclusive of both pickup and return day
     * @return total cost for the whole rental, rounded to paise
     */
    double calculateCost(VehicleType vehicleType, long days);
}
