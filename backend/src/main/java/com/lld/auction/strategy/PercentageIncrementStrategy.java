package com.lld.auction.strategy;

import com.lld.auction.model.Auction;
import org.springframework.stereotype.Component;

/** Next bid must clear the current bid by a percentage of it ({@code auction.incrementValue} as a
 *  whole percent, e.g. 5 means the next bid must be at least 5% above the current one). Rounded
 *  to 2 decimal places, same convention as splitwise's split-amount rounding. */
@Component
public class PercentageIncrementStrategy implements BidIncrementStrategy {

    @Override
    public String name() {
        return "PercentageIncrement";
    }

    @Override
    public double minNextBid(Auction auction) {
        double raw = auction.getCurrentBid() * (1 + auction.getIncrementValue() / 100.0);
        return Math.round(raw * 100.0) / 100.0;
    }
}
