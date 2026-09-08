package com.lld.blackjack.model;

import lombok.Getter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * A hand of cards. {@link #getValue()} and {@link #isSoft()} both derive from the same
 * "downgrade an Ace from 11 to 1 only if the hand would otherwise bust" computation — done once
 * in {@link #computeValue()} rather than duplicated, since an inconsistency between the two
 * would let {@code HitOnSoft17Strategy} and {@code StandOnSoft17Strategy} disagree about whether
 * a 17 is soft.
 */
@Getter
public class Hand {

    private final List<Card> cards = new ArrayList<>();

    public void addCard(Card card) {
        cards.add(card);
    }

    public List<Card> getCards() {
        return Collections.unmodifiableList(cards);
    }

    public int getValue() {
        return computeValue().total();
    }

    /** True if at least one Ace in this hand is still being counted as 11. */
    public boolean isSoft() {
        return computeValue().softAceRemaining();
    }

    public boolean isBust() {
        return getValue() > 21;
    }

    public boolean isBlackjack() {
        return cards.size() == 2 && getValue() == 21;
    }

    private ValueResult computeValue() {
        int total = 0;
        int aceCount = 0;
        for (Card card : cards) {
            total += card.getRank().getBaseValue();
            if (card.getRank() == Rank.ACE) {
                aceCount++;
            }
        }
        while (total > 21 && aceCount > 0) {
            total -= 10;
            aceCount--;
        }
        return new ValueResult(total, aceCount > 0);
    }

    private record ValueResult(int total, boolean softAceRemaining) {
    }
}
