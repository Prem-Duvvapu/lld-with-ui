package com.lld.learning.examples.yagni;

import java.util.Map;

public final class YagniDemo {
    public static void main(String[] args) {
        CurrentParcelQuote current = new CurrentParcelQuote();
        SpeculativeQuoteEngine speculative = new SpeculativeQuoteEngine(Map.of("STANDARD", 200));
        System.out.println("today, 3 parcels: current=" + current.quoteCents(3)
                + ", speculative=" + speculative.quoteCents("STANDARD", 3));
        try {
            current.quoteCents(0);
        } catch (IllegalArgumentException expected) {
            System.out.println("today, 0 parcels: rejected");
        }

        // A guessed per-parcel rate fits one new example but misses the per-quote discount.
        SpeculativeQuoteEngine guessedPickup = new SpeculativeQuoteEngine(Map.of("PICKUP", 100));
        PickupParcelQuote changed = new PickupParcelQuote(current);
        System.out.println("pickup, 1 parcel: guessed=" + guessedPickup.quoteCents("PICKUP", 1)
                + ", required=" + changed.quoteCents(1, true));
        System.out.println("pickup, 3 parcels: guessed=" + guessedPickup.quoteCents("PICKUP", 3)
                + ", required=" + changed.quoteCents(3, true));
        System.out.println("standard, 3 parcels after change=" + changed.quoteCents(3, false));
        System.out.println("earlier current model, 3 parcels=" + current.quoteCents(3));
    }
}
