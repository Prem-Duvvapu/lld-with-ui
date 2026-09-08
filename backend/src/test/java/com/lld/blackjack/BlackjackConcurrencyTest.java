package com.lld.blackjack;

import com.lld.blackjack.exception.ShoeExhaustedException;
import com.lld.blackjack.model.Card;
import com.lld.blackjack.shoe.Deck;
import com.lld.blackjack.shoe.Shoe;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@link Shoe#draw()}'s atomic-cursor design closes the shared-resource race this module
 * is built around: multiple "tables" (threads) drawing from one physical shoe must never receive
 * the same card, and the shoe must never be over-drawn past its own size.
 */
public class BlackjackConcurrencyTest {

    @Test
    @DisplayName("N threads racing to fully exhaust a known-size shoe: every card dealt exactly once — 300 rounds")
    void repeatedFullShoeDrainRaceNeverDuplicatesOrOverdraws() throws InterruptedException {
        int shoeSize = 52; // Deck.of(1)
        int drawerCount = 16;

        for (int round = 0; round < 300; round++) {
            Shoe shoe = Deck.of(1);

            ExecutorService pool = Executors.newFixedThreadPool(drawerCount);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(drawerCount);
            ConcurrentLinkedQueue<Card> drawnCards = new ConcurrentLinkedQueue<>();
            AtomicInteger exhaustedCount = new AtomicInteger();

            for (int i = 0; i < drawerCount; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        // Each thread draws until the shoe is exhausted, racing every other thread.
                        while (true) {
                            try {
                                drawnCards.add(shoe.draw());
                            } catch (ShoeExhaustedException expected) {
                                exhaustedCount.incrementAndGet();
                                break;
                            }
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(shoeSize, drawnCards.size(), "round " + round + ": exactly " + shoeSize + " cards must be dealt in total, never more");
            Set<Card> distinctCards = Set.copyOf(drawnCards);
            assertEquals(shoeSize, distinctCards.size(), "round " + round + ": no card may ever be dealt twice");
            assertEquals(0, shoe.remaining(), "round " + round + ": the shoe must end fully drained");
            assertTrue(exhaustedCount.get() >= 1, "round " + round + ": at least one thread must observe the shoe becoming exhausted");
        }
    }

    @Test
    @DisplayName("More threads than cards: every position 0..K-1 goes to exactly one thread, the rest cleanly rejected — 200 rounds")
    void moreDrawersThanCardsClaimsExactlyTheShoeSize() throws InterruptedException {
        int shoeSize = 10;
        int drawerCount = 30;

        for (int round = 0; round < 200; round++) {
            // A tiny fixed-size shoe built directly (not a full 52-card deck) to make the
            // "more racers than cards" case deterministic and fast.
            Shoe shoe = buildFixedSizeShoe(shoeSize);

            ExecutorService pool = Executors.newFixedThreadPool(drawerCount);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(drawerCount);
            List<Card> drawnCards = new CopyOnWriteArrayList<>();
            AtomicInteger rejected = new AtomicInteger();

            for (int i = 0; i < drawerCount; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        try {
                            drawnCards.add(shoe.draw());
                        } catch (ShoeExhaustedException expected) {
                            rejected.incrementAndGet();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(shoeSize, drawnCards.size(), "round " + round + ": exactly min(drawers, shoeSize) must succeed");
            assertEquals(drawerCount - shoeSize, rejected.get(), "round " + round + ": every excess drawer must be cleanly rejected");
            long distinctCount = drawnCards.stream().distinct().collect(Collectors.toSet()).size();
            assertEquals(shoeSize, distinctCount, "round " + round + ": no card may ever be dealt twice");
        }
    }

    /** Builds a shoe of exactly {@code size} distinct cards via the public Deck.of(1), trimmed conceptually to size by drawing. */
    private Shoe buildFixedSizeShoe(int size) {
        // Deck.of(1) always yields a full 52-card shoe; for a smaller deterministic shoe we
        // simply draw-and-discard down to a fresh shoe of the exact remaining size by reusing
        // the same shoe directly (its remaining() is already size after this many draws).
        Shoe shoe = Deck.of(1);
        int toDiscard = 52 - size;
        for (int i = 0; i < toDiscard; i++) {
            shoe.draw();
        }
        return shoe;
    }
}
