package com.lld.movieticket.strategy;

import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.Show;
import org.springframework.stereotype.Component;

@Component("basePricingStrategy")
public class BasePricingStrategy implements PricingStrategy {

    @Override
    public double calculatePrice(Show show, Seat seat) {
        if (seat == null) return 200.0;
        if (seat.getPrice() > 0) return seat.getPrice();
        return switch (seat.getSeatType()) {
            case PLATINUM -> 500.0;
            case GOLD -> 350.0;
            case SILVER -> 200.0;
        };
    }
}
