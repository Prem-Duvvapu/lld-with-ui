package com.lld.zomato.strategy;

import java.util.Locale;

public class SurgeDeliveryFeeStrategy implements DeliveryFeeStrategy {

    public static final double DEFAULT_MULTIPLIER = 2.0;
    private double multiplier;
    private final StandardDeliveryFeeStrategy standardStrategy;

    public SurgeDeliveryFeeStrategy() {
        this(DEFAULT_MULTIPLIER);
    }

    public SurgeDeliveryFeeStrategy(double multiplier) {
        this.standardStrategy = new StandardDeliveryFeeStrategy();
        setMultiplier(multiplier);
    }

    public double getMultiplier() {
        return multiplier;
    }

    public void setMultiplier(double multiplier) {
        if (multiplier < 1.0 || multiplier > 3.0) {
            throw new IllegalArgumentException("Multiplier must be between 1.0 and 3.0, was: " + multiplier);
        }
        this.multiplier = multiplier;
    }

    @Override
    public String getName() {
        return String.format(Locale.US, "SURGE_%.1fx", multiplier);
    }

    @Override
    public double computeFee(double distanceKm, double orderValue) {
        double baseFee = standardStrategy.computeFee(distanceKm, orderValue);
        double surged = baseFee * multiplier;
        return Math.round(surged * 100.0) / 100.0;
    }
}
