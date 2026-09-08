package com.lld.blackjack.strategy;

import com.lld.blackjack.model.Hand;
import org.springframework.stereotype.Component;

/** The dealer stops as soon as their hand reaches 17, soft or hard. */
@Component
public class StandOnSoft17Strategy implements DealerStrategy {
    @Override
    public boolean shouldHit(Hand dealerHand) {
        return dealerHand.getValue() < 17;
    }
}
