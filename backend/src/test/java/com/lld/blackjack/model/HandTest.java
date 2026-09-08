package com.lld.blackjack.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Proves the soft/hard Ace downgrade logic, since a bug here would silently corrupt every strategy decision. */
public class HandTest {

    @Test
    void twoCardsSumPlainly() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.KING, Suit.SPADES));
        hand.addCard(new Card(Rank.SEVEN, Suit.HEARTS));
        assertEquals(17, hand.getValue());
        assertFalse(hand.isSoft());
    }

    @Test
    void aceCountsAsElevenWhenItDoesNotBust() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.ACE, Suit.SPADES));
        hand.addCard(new Card(Rank.SIX, Suit.HEARTS));
        assertEquals(17, hand.getValue());
        assertTrue(hand.isSoft(), "Ace+6 is the textbook soft 17");
    }

    @Test
    void aceDowngradesToOneToAvoidBusting() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.ACE, Suit.SPADES));
        hand.addCard(new Card(Rank.SIX, Suit.HEARTS));
        hand.addCard(new Card(Rank.NINE, Suit.CLUBS));
        // 11+6+9=26 would bust -- the Ace must downgrade to 1, giving 16.
        assertEquals(16, hand.getValue());
        assertFalse(hand.isSoft(), "once downgraded, the Ace is a hard 1 -- no soft total remains");
    }

    @Test
    void twoAcesOnlyOneStaysSoft() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.ACE, Suit.SPADES));
        hand.addCard(new Card(Rank.ACE, Suit.HEARTS));
        // 11+11=22 busts -- exactly one Ace must downgrade, giving 12 (11+1).
        assertEquals(12, hand.getValue());
        assertTrue(hand.isSoft(), "one Ace is still counted as 11");
    }

    @Test
    void isBustOnlyTrueOverTwentyOne() {
        Hand hand = new Hand();
        hand.addCard(new Card(Rank.KING, Suit.SPADES));
        hand.addCard(new Card(Rank.QUEEN, Suit.HEARTS));
        hand.addCard(new Card(Rank.TWO, Suit.CLUBS));
        assertTrue(hand.isBust());
    }

    @Test
    void isBlackjackOnlyForATwoCardTwentyOne() {
        Hand natural = new Hand();
        natural.addCard(new Card(Rank.ACE, Suit.SPADES));
        natural.addCard(new Card(Rank.KING, Suit.HEARTS));
        assertTrue(natural.isBlackjack());

        Hand slowTwentyOne = new Hand();
        slowTwentyOne.addCard(new Card(Rank.SEVEN, Suit.SPADES));
        slowTwentyOne.addCard(new Card(Rank.SEVEN, Suit.HEARTS));
        slowTwentyOne.addCard(new Card(Rank.SEVEN, Suit.CLUBS));
        assertEquals(21, slowTwentyOne.getValue());
        assertFalse(slowTwentyOne.isBlackjack(), "21 across 3 cards is NOT a natural blackjack");
    }
}
