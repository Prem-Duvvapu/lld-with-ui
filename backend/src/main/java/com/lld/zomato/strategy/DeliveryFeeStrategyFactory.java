package com.lld.zomato.strategy;

public class DeliveryFeeStrategyFactory {

    /** Stateless, so a single shared instance is safe. */
    private static final DeliveryFeeStrategy FREE_DELIVERY = new FreeDeliveryStrategy();
    private static final DeliveryFeeStrategy STANDARD_DELIVERY = new StandardDeliveryFeeStrategy();

    static final double SURGE_MULTIPLIER = 2.0;

    public static DeliveryFeeStrategy forConditions(double orderValue, int pendingOrders, int availableAgents) {
        if (orderValue >= 500.0) {
            return FREE_DELIVERY;
        }
        if (availableAgents == 0 || pendingOrders >= availableAgents * 3) {
            // A fresh instance per call: SurgeDeliveryFeeStrategy carries a mutable multiplier,
            // so a shared static one would let any caller re-price every subsequent order in
            // the process.
            return new SurgeDeliveryFeeStrategy(SURGE_MULTIPLIER);
        }
        return STANDARD_DELIVERY;
    }
}
