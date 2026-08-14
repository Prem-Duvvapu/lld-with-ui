package com.lld.movieticket.strategy;

import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.Show;
import org.springframework.stereotype.Component;

@Component("surgePricingStrategy")
public class SurgePricingStrategy implements PricingStrategy {
    private final BasePricingStrategy basePricingStrategy = new BasePricingStrategy();
    private final double multiplier;

    public SurgePricingStrategy() {
        this.multiplier = 1.25; // 25% surge
    }

    public SurgePricingStrategy(double multiplier) {
        this.multiplier = multiplier;
    }

    @Override
    public double calculatePrice(Show show, Seat seat) {
        double base = basePricingStrategy.calculatePrice(show, seat);
        return base * multiplier;
    }
}
