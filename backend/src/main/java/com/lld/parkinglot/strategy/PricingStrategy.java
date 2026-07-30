package com.lld.parkinglot.strategy;

import com.lld.parkinglot.model.Ticket;

public interface PricingStrategy {
    double calculatePrice(Ticket ticket);
}
