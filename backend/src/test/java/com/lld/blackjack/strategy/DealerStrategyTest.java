package com.lld.blackjack.strategy;

import com.lld.blackjack.model.Card;
import com.lld.blackjack.model.DealerStrategyType;
import com.lld.blackjack.model.Hand;
import com.lld.blackjack.model.Rank;
import com.lld.blackjack.model.Suit;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Proves the two house rules genuinely diverge on the one hand that distinguishes them: a soft 17. */
public class DealerStrategyTest {

    private Hand softSeventeen() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.ACE, Suit.SPADES));
        hand.addCard(new Card(Rank.SIX, Suit.HEARTS));
        return hand;
    }

    @Test
    void hitOnSoft17HitsASoftSeventeen() {
        assertTrue(new HitOnSoft17Strategy().shouldHit(softSeventeen()));
    }

    @Test
    void standOnSoft17StandsOnASoftSeventeen() {
        assertFalse(new StandOnSoft17Strategy().shouldHit(softSeventeen()));
    }

    @Test
    void bothStrategiesHitBelowSeventeen() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.TEN, Suit.SPADES));
        hand.addCard(new Card(Rank.SIX, Suit.HEARTS));
        assertTrue(new HitOnSoft17Strategy().shouldHit(hand));
        assertTrue(new StandOnSoft17Strategy().shouldHit(hand));
    }

    @Test
    void bothStrategiesStandOnAHardSeventeenOrAbove() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.TEN, Suit.SPADES));
        hand.addCard(new Card(Rank.SEVEN, Suit.HEARTS));
        assertFalse(new HitOnSoft17Strategy().shouldHit(hand));
        assertFalse(new StandOnSoft17Strategy().shouldHit(hand));
    }

    @Test
    void factoryResolvesEachTypeToItsOwnStrategyInstance() {
        DealerStrategyFactory factory = new DealerStrategyFactory(new HitOnSoft17Strategy(), new StandOnSoft17Strategy());
        assertInstanceOf(HitOnSoft17Strategy.class, factory.forType(DealerStrategyType.HIT_ON_SOFT_17));
        assertInstanceOf(StandOnSoft17Strategy.class, factory.forType(DealerStrategyType.STAND_ON_SOFT_17));
    }
}
