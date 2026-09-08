package com.lld.blackjack.shoe;

import com.lld.blackjack.exception.ShoeExhaustedException;
import com.lld.blackjack.model.Card;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * A pre-shuffled, fixed-size, immutable shoe shared by every table playing against it — the
 * concurrency centerpiece of this module. {@link #draw()} is a single atomic pop guarded by an
 * {@link AtomicInteger} cursor into the immutable backing array: genuinely lock-free, unlike the
 * CAS-retry-loop shapes elsewhere in this repo (e.g. {@code kvstore}'s compare-and-swap) — the
 * array is fixed-size and fully known upfront at shuffle time, so there is nothing to retry.
 * Two tables racing {@link #draw()} can never receive the same physical card, and once the shoe
 * is exhausted every further draw cleanly throws rather than over-drawing or returning null.
 */
public class Shoe {

    private final Card[] cards;
    private final AtomicInteger cursor = new AtomicInteger(0);

    Shoe(Card[] cards) {
        this.cards = cards;
    }

    public Card draw() {
        int idx = cursor.getAndIncrement();
        if (idx >= cards.length) {
            throw new ShoeExhaustedException("Shoe is exhausted -- no cards remain");
        }
        return cards[idx];
    }

    public int size() {
        return cards.length;
    }

    public int remaining() {
        return Math.max(0, cards.length - cursor.get());
    }
}
