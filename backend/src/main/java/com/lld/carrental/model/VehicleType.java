package com.lld.carrental.model;

/**
 * Fleet categories and their base daily rate.
 *
 * <p>The rate lives on the enum rather than as constants in the service, so adding a
 * category is one edit here instead of a new arm in every pricing {@code switch}
 * (same idiom as {@code uber.model.VehicleType}).
 */
public enum VehicleType {
    HATCHBACK(1200.0),
    SEDAN(1800.0),
    SUV(2800.0),
    VAN(3200.0),
    TRUCK(4000.0);

    private final double baseDailyRate;

    VehicleType(double baseDailyRate) {
        this.baseDailyRate = baseDailyRate;
    }

    public double getBaseDailyRate() {
        return baseDailyRate;
    }
}
