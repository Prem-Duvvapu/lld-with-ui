package com.lld.blackjack.strategy;

import com.lld.blackjack.model.Hand;

public interface DealerStrategy {
    /** True if the dealer must draw another card given their current hand. */
    boolean shouldHit(Hand dealerHand);
}
