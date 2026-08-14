package com.lld.movieticket.strategy;

import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.Show;

public interface PricingStrategy {
    double calculatePrice(Show show, Seat seat);
}
