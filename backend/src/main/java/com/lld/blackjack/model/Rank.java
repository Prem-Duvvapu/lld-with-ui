package com.lld.blackjack.model;

/**
 * {@code baseValue} is the un-adjusted blackjack value — an Ace's is 11. {@link Hand} is the one
 * place that ever downgrades an Ace to 1 to avoid busting, so this enum stays a pure fact about
 * the card, not a hand-dependent decision.
 */
public enum Rank {
    TWO(2), THREE(3), FOUR(4), FIVE(5), SIX(6), SEVEN(7), EIGHT(8), NINE(9), TEN(10),
    JACK(10), QUEEN(10), KING(10), ACE(11);

    private final int baseValue;

    Rank(int baseValue) {
        this.baseValue = baseValue;
    }

    public int getBaseValue() {
        return baseValue;
    }
}
