package com.lld.parkinglot.strategy;

import com.lld.parkinglot.model.Ticket;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Component("hourlyPricingStrategy")
public class HourlyPricingStrategy implements PricingStrategy {

    private static final double HOURLY_RATE_CAR = 20.0;
    private static final double HOURLY_RATE_BIKE = 10.0;
    private static final double HOURLY_RATE_TRUCK = 40.0;

    @Override
    public double calculatePrice(Ticket ticket) {
        LocalDateTime exitTime = ticket.getExitTime() != null ? ticket.getExitTime() : LocalDateTime.now();
        long hours = ChronoUnit.HOURS.between(ticket.getEntryTime(), exitTime);
        if (hours < 1) hours = 1;

        double rate = switch (ticket.getVehicleType()) {
            case CAR -> HOURLY_RATE_CAR;
            case BIKE -> HOURLY_RATE_BIKE;
            case TRUCK -> HOURLY_RATE_TRUCK;
        };

        return hours * rate;
    }
}
