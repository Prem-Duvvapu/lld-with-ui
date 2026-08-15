package com.lld.airline.strategy;

import com.lld.airline.model.Flight;
import com.lld.airline.model.SeatTemplate;

public interface PricingStrategy {
    double calculateSeatPrice(SeatTemplate template, Flight flight);
}
