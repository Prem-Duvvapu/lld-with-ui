package com.lld.parkinglot.strategy;

import com.lld.parkinglot.model.Ticket;
import org.springframework.stereotype.Component;

@Component("flatRatePricingStrategy")
public class FlatRatePricingStrategy implements PricingStrategy {

    private static final double FLAT_RATE_CAR = 50.0;
    private static final double FLAT_RATE_BIKE = 25.0;
    private static final double FLAT_RATE_TRUCK = 100.0;

    @Override
    public double calculatePrice(Ticket ticket) {
        return switch (ticket.getVehicleType()) {
            case CAR -> FLAT_RATE_CAR;
            case BIKE -> FLAT_RATE_BIKE;
            case TRUCK -> FLAT_RATE_TRUCK;
        };
    }
}
