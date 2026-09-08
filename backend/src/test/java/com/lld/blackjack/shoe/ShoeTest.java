package com.lld.blackjack.shoe;

import com.lld.blackjack.exception.ShoeExhaustedException;
import com.lld.blackjack.model.Card;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class ShoeTest {

    @Test
    void oneDeckHasFiftyTwoUniqueCards() {
        Shoe shoe = Deck.of(1);
        assertEquals(52, shoe.size());
        assertEquals(52, shoe.remaining());

        Set<Card> seen = new HashSet<>();
        for (int i = 0; i < 52; i++) {
            assertTrue(seen.add(shoe.draw()), "a single deck must never contain a duplicate rank+suit");
        }
        assertEquals(52, seen.size());
    }

    @Test
    void sixDecksHasThreeHundredTwelveCardsWithDuplicatesAllowedAcrossDecks() {
        Shoe shoe = Deck.of(6);
        assertEquals(312, shoe.size());
    }

    @Test
    void drawingPastTheEndThrowsShoeExhaustedException() {
        Shoe shoe = Deck.of(1);
        for (int i = 0; i < 52; i++) {
            shoe.draw();
        }
        assertEquals(0, shoe.remaining());
        assertThrows(ShoeExhaustedException.class, shoe::draw);
    }

    @Test
    void remainingDecreasesWithEveryDraw() {
        Shoe shoe = Deck.of(1);
        shoe.draw();
        shoe.draw();
        assertEquals(50, shoe.remaining());
    }
}
