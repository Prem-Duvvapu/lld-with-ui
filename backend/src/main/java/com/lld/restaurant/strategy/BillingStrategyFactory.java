package com.lld.restaurant.strategy;

import java.time.LocalTime;

public class BillingStrategyFactory {
    private static final BillingStrategy STANDARD = new StandardBillingStrategy();
    private static final BillingStrategy HAPPY_HOUR = new HappyHourBillingStrategy();

    public static BillingStrategy forTime(LocalTime t) {
        if (t == null) {
            return STANDARD;
        }
        int hour = t.getHour();
        if (hour >= 16 && hour <= 18) {
            return HAPPY_HOUR;
        }
        return STANDARD;
    }
}
