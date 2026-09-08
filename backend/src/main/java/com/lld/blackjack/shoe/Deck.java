package com.lld.blackjack.shoe;

import com.lld.blackjack.model.Card;
import com.lld.blackjack.model.Rank;
import com.lld.blackjack.model.Suit;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Factory Pattern: {@link #of(int)} builds and shuffles {@code deckCount} standard 52-card decks
 * into one flat {@link Shoe} — a static factory method rather than a Spring-managed factory
 * bean, since a shoe is constructed once per table-group (on demand, or on {@code /sim/reset}),
 * never resolved repeatedly from a shared singleton.
 */
public final class Deck {

    private Deck() {
    }

    public static Shoe of(int deckCount) {
        List<Card> cards = new ArrayList<>(deckCount * 52);
        for (int d = 0; d < deckCount; d++) {
            for (Suit suit : Suit.values()) {
                for (Rank rank : Rank.values()) {
                    cards.add(new Card(rank, suit));
                }
            }
        }
        Collections.shuffle(cards);
        return new Shoe(cards.toArray(new Card[0]));
    }
}
