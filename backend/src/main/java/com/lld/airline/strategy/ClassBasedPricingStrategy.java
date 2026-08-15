package com.lld.airline.strategy;

import com.lld.airline.model.Flight;
import com.lld.airline.model.SeatTemplate;
import org.springframework.stereotype.Component;

@Component
public class ClassBasedPricingStrategy implements PricingStrategy {

    private final double baseRate; // Base Economy rate = ₹4500

    public ClassBasedPricingStrategy() {
        this.baseRate = 4500.0;
    }

    public ClassBasedPricingStrategy(double baseRate) {
        this.baseRate = baseRate;
    }

    @Override
    public double calculateSeatPrice(SeatTemplate template, Flight flight) {
        if (template == null || template.getSeatClass() == null) {
            return baseRate;
        }

        switch (template.getSeatClass()) {
            case FIRST:
                return baseRate * 5.0; // ₹22,500
            case BUSINESS:
                return baseRate * 3.0; // ₹13,500
            case PREMIUM_ECONOMY:
                return baseRate * 1.5; // ₹6,750
            case ECONOMY:
            default:
                return baseRate * 1.0; // ₹4,500
        }
    }
}
