package com.lld.blackjack;

import com.lld.blackjack.exception.InvalidActionException;
import com.lld.blackjack.exception.ShoeExhaustedException;
import com.lld.blackjack.model.Card;
import com.lld.blackjack.model.DealerStrategyType;
import com.lld.blackjack.model.Rank;
import com.lld.blackjack.model.RoundOutcome;
import com.lld.blackjack.model.RoundStatus;
import com.lld.blackjack.model.Suit;
import com.lld.blackjack.model.Table;
import com.lld.blackjack.repository.BlackjackRepository;
import com.lld.blackjack.service.BlackjackService;
import com.lld.blackjack.shoe.Deck;
import com.lld.blackjack.shoe.Shoe;
import com.lld.blackjack.strategy.DealerStrategyFactory;
import com.lld.blackjack.strategy.HitOnSoft17Strategy;
import com.lld.blackjack.strategy.StandOnSoft17Strategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Proves both blackjack concurrency boundaries: one fair lock serializes a table's whole action,
 * while {@link Shoe#draw()}'s atomic cursor lets different tables draw concurrently without ever
 * receiving the same physical card or over-drawing the shoe.
 */
public class BlackjackConcurrencyTest {

    @Test
    @DisplayName("Two deals on one table serialize across the entire round mutation")
    void concurrentDealsOnSameTableAllowOneCoherentDeal() throws Exception {
        BlackjackRepository repository = new BlackjackRepository();
        BlackjackService service = newService(repository);
        Table table = service.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        BlockingDraw blockingDraw = blockingShoe(1,
                card(Rank.TWO, Suit.HEARTS), card(Rank.FOUR, Suit.HEARTS),
                card(Rank.THREE, Suit.DIAMONDS), card(Rank.FIVE, Suit.DIAMONDS));
        repository.setShoe(blockingDraw.shoe());

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch contenderStarted = new CountDownLatch(1);
        CountDownLatch contenderFinished = new CountDownLatch(1);
        try {
            Future<Table> first = pool.submit(() -> service.deal(table.getId()));
            assertTrue(blockingDraw.entered().await(1, TimeUnit.SECONDS));

            Future<Table> second = pool.submit(() -> {
                contenderStarted.countDown();
                try {
                    return service.deal(table.getId());
                } finally {
                    contenderFinished.countDown();
                }
            });
            assertTrue(contenderStarted.await(1, TimeUnit.SECONDS));
            assertFalse(contenderFinished.await(200, TimeUnit.MILLISECONDS),
                    "the second deal must wait for the first table action to commit");

            blockingDraw.release().countDown();
            first.get(1, TimeUnit.SECONDS);
            ExecutionException rejected = assertThrows(ExecutionException.class,
                    () -> second.get(1, TimeUnit.SECONDS));
            assertInstanceOf(InvalidActionException.class, rejected.getCause());

            assertEquals(RoundStatus.PLAYER_TURN, table.getStatus());
            assertEquals(2, table.getPlayerHand().getCards().size());
            assertEquals(2, table.getDealerHand().getCards().size());
        } finally {
            blockingDraw.release().countDown();
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("Hit and stand on one table cannot interleave their hand and settlement mutations")
    void hitAndStandOnSameTableAreSerialized() throws Exception {
        BlackjackRepository repository = new BlackjackRepository();
        BlackjackService service = newService(repository);
        BlockingDraw blockingDraw = blockingShoe(5,
                card(Rank.FIVE, Suit.HEARTS), card(Rank.TEN, Suit.DIAMONDS),
                card(Rank.FIVE, Suit.CLUBS), card(Rank.SEVEN, Suit.SPADES),
                card(Rank.ACE, Suit.HEARTS));
        repository.setShoe(blockingDraw.shoe());
        Table table = service.createTable(DealerStrategyType.STAND_ON_SOFT_17);
        service.deal(table.getId());
        assertEquals(RoundStatus.PLAYER_TURN, table.getStatus());

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch standStarted = new CountDownLatch(1);
        CountDownLatch standFinished = new CountDownLatch(1);
        try {
            Future<Table> hit = pool.submit(() -> service.hit(table.getId()));
            assertTrue(blockingDraw.entered().await(1, TimeUnit.SECONDS));

            Future<Table> stand = pool.submit(() -> {
                standStarted.countDown();
                try {
                    return service.stand(table.getId());
                } finally {
                    standFinished.countDown();
                }
            });
            assertTrue(standStarted.await(1, TimeUnit.SECONDS));
            assertFalse(standFinished.await(200, TimeUnit.MILLISECONDS),
                    "stand must not settle while hit is still mutating the player hand");

            blockingDraw.release().countDown();
            hit.get(1, TimeUnit.SECONDS);
            stand.get(1, TimeUnit.SECONDS);

            assertEquals(21, table.getPlayerHand().getValue());
            assertEquals(17, table.getDealerHand().getValue());
            assertEquals(RoundStatus.SETTLEMENT, table.getStatus());
            assertEquals(RoundOutcome.PLAYER_WIN, table.getOutcome());
        } finally {
            blockingDraw.release().countDown();
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("A blocked action on one table never blocks a different table")
    void disjointTablesProgressIndependently() throws Exception {
        BlackjackRepository repository = new BlackjackRepository();
        BlackjackService service = newService(repository);
        BlockingDraw blockingDraw = blockingShoe(1,
                card(Rank.TWO, Suit.HEARTS), card(Rank.THREE, Suit.HEARTS),
                card(Rank.FOUR, Suit.HEARTS), card(Rank.FIVE, Suit.HEARTS),
                card(Rank.SIX, Suit.HEARTS), card(Rank.SEVEN, Suit.HEARTS),
                card(Rank.EIGHT, Suit.HEARTS), card(Rank.NINE, Suit.HEARTS));
        repository.setShoe(blockingDraw.shoe());
        Table blockedTable = service.createTable(DealerStrategyType.HIT_ON_SOFT_17);
        Table independentTable = service.createTable(DealerStrategyType.HIT_ON_SOFT_17);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Table> blocked = pool.submit(() -> service.deal(blockedTable.getId()));
            assertTrue(blockingDraw.entered().await(1, TimeUnit.SECONDS));

            Future<Table> independent = pool.submit(() -> service.deal(independentTable.getId()));
            Table completed = independent.get(1, TimeUnit.SECONDS);
            assertEquals(RoundStatus.PLAYER_TURN, completed.getStatus());
            assertFalse(blocked.isDone(), "the first table should still be paused inside its own lock");

            blockingDraw.release().countDown();
            blocked.get(1, TimeUnit.SECONDS);
            assertEquals(RoundStatus.PLAYER_TURN, blockedTable.getStatus());
        } finally {
            blockingDraw.release().countDown();
            pool.shutdownNow();
        }
    }

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

    private BlackjackService newService(BlackjackRepository repository) {
        DealerStrategyFactory factory = new DealerStrategyFactory(
                new HitOnSoft17Strategy(), new StandOnSoft17Strategy());
        return new BlackjackService(repository, factory);
    }

    private BlockingDraw blockingShoe(int blockedDrawNumber, Card... cards) {
        Shoe shoe = mock(Shoe.class);
        AtomicInteger cursor = new AtomicInteger();
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(shoe.draw()).thenAnswer(ignored -> {
            int index = cursor.getAndIncrement();
            if (index + 1 == blockedDrawNumber) {
                entered.countDown();
                try {
                    if (!release.await(2, TimeUnit.SECONDS)) {
                        throw new AssertionError("timed out waiting to release the controlled shoe draw");
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new AssertionError("controlled shoe draw was interrupted", e);
                }
            }
            return cards[index];
        });
        return new BlockingDraw(shoe, entered, release);
    }

    private Card card(Rank rank, Suit suit) {
        return new Card(rank, suit);
    }

    private record BlockingDraw(Shoe shoe, CountDownLatch entered, CountDownLatch release) {
    }
}
