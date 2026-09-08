package com.lld.blackjack.strategy;

import com.lld.blackjack.model.Hand;
import org.springframework.stereotype.Component;

/** The dealer hits on a soft 17 (e.g. Ace+6) as well as any hand under 17. */
@Component
public class HitOnSoft17Strategy implements DealerStrategy {
    @Override
    public boolean shouldHit(Hand dealerHand) {
        int value = dealerHand.getValue();
        return value < 17 || (value == 17 && dealerHand.isSoft());
    }
}
