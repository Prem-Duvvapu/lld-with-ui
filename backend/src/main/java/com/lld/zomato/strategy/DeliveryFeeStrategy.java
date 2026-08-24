package com.lld.zomato.strategy;

public interface DeliveryFeeStrategy {
    String getName();
    double computeFee(double distanceKm, double orderValue);
}
