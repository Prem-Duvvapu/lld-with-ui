package com.lld.airline.strategy;

import com.lld.airline.model.Flight;
import com.lld.airline.model.SeatTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Demand-based dynamic pricing: starts from the same per-class base fare as
 * {@link ClassBasedPricingStrategy} but scales it up the closer the flight is to departure —
 * the classic "seats get pricier as the flight fills its calendar window" airline behaviour.
 */
@Component
public class DemandSurgePricingStrategy implements PricingStrategy {

    private final ClassBasedPricingStrategy baseStrategy;

    public DemandSurgePricingStrategy() {
        this.baseStrategy = new ClassBasedPricingStrategy();
    }

    @Override
    public double calculateSeatPrice(SeatTemplate template, Flight flight) {
        double base = baseStrategy.calculateSeatPrice(template, flight);
        return base * surgeMultiplier(flight);
    }

    private double surgeMultiplier(Flight flight) {
        if (flight == null || flight.getDepartureTime() == null) {
            return 1.0;
        }
        long daysOut = Duration.between(LocalDateTime.now(), flight.getDepartureTime()).toDays();
        if (daysOut < 3) {
            return 1.35; // last-minute premium
        } else if (daysOut < 14) {
            return 1.15; // approaching-departure surge
        }
        return 1.0; // booked well in advance
    }
}
