package com.lld.auction.strategy;

import com.lld.auction.model.Auction;
import org.springframework.stereotype.Component;

/** Next bid must clear the current bid by a fixed currency amount ({@code auction.incrementValue}). */
@Component
public class FixedIncrementStrategy implements BidIncrementStrategy {

    @Override
    public String name() {
        return "FixedIncrement";
    }

    @Override
    public double minNextBid(Auction auction) {
        return auction.getCurrentBid() + auction.getIncrementValue();
    }
}
