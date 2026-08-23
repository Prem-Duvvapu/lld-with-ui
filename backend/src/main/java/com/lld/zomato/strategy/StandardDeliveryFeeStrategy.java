package com.lld.zomato.strategy;

public class StandardDeliveryFeeStrategy implements DeliveryFeeStrategy {

    @Override
    public String getName() {
        return "STANDARD";
    }

    @Override
    public double computeFee(double distanceKm, double orderValue) {
        double fee = 30.0 + 8.0 * distanceKm;
        return Math.round(fee * 100.0) / 100.0;
    }
}
