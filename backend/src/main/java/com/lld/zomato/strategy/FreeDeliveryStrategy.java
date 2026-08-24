package com.lld.zomato.strategy;

public class FreeDeliveryStrategy implements DeliveryFeeStrategy {

    @Override
    public String getName() {
        return "FREE_ABOVE_500";
    }

    @Override
    public double computeFee(double distanceKm, double orderValue) {
        return 0.0;
    }
}
