package com.lld.blackjack.model;

import lombok.Value;

/** An immutable physical card. Two {@code Card}s are equal iff rank and suit both match. */
@Value
public class Card {
    Rank rank;
    Suit suit;
}
