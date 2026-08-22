package com.lld.uber.model;

/**
 * Vehicle classes and their per-kilometre rate.
 *
 * <p>The rate lives on the enum rather than as constants in the service, so adding a
 * class is one edit here instead of a new arm in every `switch` that prices a trip.
 */
public enum VehicleType {
    UBER_GO(12.0, 4),
    UBER_XL(18.0, 6),
    UBER_PREMIUM(25.0, 4);

    private final double perKmRate;
    private final int seats;

    VehicleType(double perKmRate, int seats) {
        this.perKmRate = perKmRate;
        this.seats = seats;
    }

    public double getPerKmRate() {
        return perKmRate;
    }

    public int getSeats() {
        return seats;
    }
}
