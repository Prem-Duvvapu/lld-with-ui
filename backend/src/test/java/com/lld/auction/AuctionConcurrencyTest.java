package com.lld.auction;

import com.lld.auction.exception.BidTooLowException;
import com.lld.auction.model.Auction;
import com.lld.auction.observer.AuctionNotifier;
import com.lld.auction.observer.InAppAuctionObserver;
import com.lld.auction.observer.LoggingAuctionObserver;
import com.lld.auction.repository.AuctionRepository;
import com.lld.auction.service.AuctionService;
import com.lld.auction.strategy.BidIncrementPolicy;
import com.lld.auction.strategy.BidIncrementStrategyFactory;
import com.lld.auction.strategy.FixedIncrementStrategy;
import com.lld.auction.strategy.PercentageIncrementStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the check-then-act race in {@link AuctionService#placeBid}: N bidders offering the
 * EXACT SAME amount at the exact same instant must produce exactly one winner, the rest cleanly
 * rejected with {@link BidTooLowException}, and the auction's final state must reflect that
 * winner deterministically — never a corrupted or contradictory current bid. Deterministic via
 * {@link CountDownLatch}, not sleeps, per this repo's concurrency-test convention (see
 * {@code InventoryConcurrencyTest}).
 */
@DisplayName("Auction Concurrency — per-auction bid lock")
class AuctionConcurrencyTest {

    private AuctionService newService() {
        AuctionRepository repo = new AuctionRepository();
        InAppAuctionObserver inApp = new InAppAuctionObserver();
        AuctionNotifier notifier = new AuctionNotifier(List.of(inApp, new LoggingAuctionObserver()));
        BidIncrementStrategyFactory factory =
                new BidIncrementStrategyFactory(new FixedIncrementStrategy(), new PercentageIncrementStrategy());
        return new AuctionService(repo, notifier, inApp, factory);
    }

    @Test
    @DisplayName("N bidders offering the identical amount at once: exactly one wins, the rest are rejected")
    void equalAmountRace_onlyOneWins() throws InterruptedException {
        AuctionService service = newService();
        long auctionId = service.createAuction("Contested Item", "d", 100, 10, 0, BidIncrementPolicy.FIXED, 10).getId();
        double amount = 110; // the minimum acceptable first bid

        int bidders = 12;
        long[] bidderIds = new long[bidders];
        for (int i = 0; i < bidders; i++) {
            bidderIds[i] = service.registerBidder("Bidder-" + i, "b" + i + "@x.com").getId();
        }

        ExecutorService pool = Executors.newFixedThreadPool(bidders);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(bidders);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (long bidderId : bidderIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.placeBid(auctionId, bidderId, amount);
                    wins.incrementAndGet();
                } catch (BidTooLowException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "bidders did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one bidder may claim the identical winning amount");
        assertEquals(bidders - 1, rejections.get(), "everyone else must be cleanly rejected");

        Auction after = service.getAuction(auctionId);
        assertEquals(amount, after.getCurrentBid(), 0.0001, "final bid must equal the contested amount exactly once");
        assertNotNull(after.getHighestBidderId());
        boolean winnerWasARacer = java.util.stream.LongStream.of(bidderIds).anyMatch(id -> id == after.getHighestBidderId());
        assertTrue(winnerWasARacer, "winner must be one of the racing bidders");
        assertEquals(1, service.getBidsForAuction(auctionId).size(), "only the winning bid is ever persisted");
    }

    @Test
    @DisplayName("N bidders racing with strictly increasing offers: the highest wins, never more than one")
    void ascendingRace_highestWins() throws InterruptedException {
        AuctionService service = newService();
        long auctionId = service.createAuction("Contested Item", "d", 100, 10, 0, BidIncrementPolicy.FIXED, 5).getId();

        int bidders = 15;
        long[] bidderIds = new long[bidders];
        for (int i = 0; i < bidders; i++) {
            bidderIds[i] = service.registerBidder("Bidder-" + i, "b" + i + "@x.com").getId();
        }

        ExecutorService pool = Executors.newFixedThreadPool(bidders);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(bidders);
        AtomicInteger wins = new AtomicInteger();

        // Every thread tries a HIGH, identical amount — only one can actually own that exact
        // number as the recorded winning bid even though several might race to claim it.
        double amount = 100 + 10 + bidders; // comfortably above every thread's own minimum
        for (long bidderId : bidderIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.placeBid(auctionId, bidderId, amount);
                    wins.incrementAndGet();
                } catch (BidTooLowException expected) {
                    // lost the race for this exact amount — correct
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "bidders did not finish in time");
        pool.shutdown();

        assertEquals(1, wins.get());
        assertEquals(amount, service.getAuction(auctionId).getCurrentBid(), 0.0001);
    }

    @Test
    @DisplayName("Disjoint auctions do not contend — all succeed in parallel")
    void disjointAuctionsAllSucceed() throws InterruptedException {
        AuctionService service = newService();
        int n = 6;
        long[] auctionIds = new long[n];
        long[] bidderIds = new long[n];
        for (int i = 0; i < n; i++) {
            auctionIds[i] = service.createAuction("Item " + i, "d", 100, 10, 0, BidIncrementPolicy.FIXED, 10).getId();
            bidderIds[i] = service.registerBidder("Bidder-" + i, "b" + i + "@x.com").getId();
        }

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger wins = new AtomicInteger();

        for (int i = 0; i < n; i++) {
            long auctionId = auctionIds[i];
            long bidderId = bidderIds[i];
            pool.submit(() -> {
                try {
                    start.await();
                    service.placeBid(auctionId, bidderId, 110);
                    wins.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "auctions did not finish in time");
        pool.shutdown();

        assertEquals(n, wins.get(), "all disjoint auction bids must succeed in parallel");
    }

    @Test
    @DisplayName("Repeated equal-amount race never produces two winners — 300 rounds")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            AuctionService service = newService();
            long auctionId = service.createAuction("Item", "d", 100, 10, 0, BidIncrementPolicy.FIXED, 10).getId();
            long alice = service.registerBidder("Alice-" + round, "a" + round + "@x.com").getId();
            long bob = service.registerBidder("Bob-" + round, "b" + round + "@x.com").getId();

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger();

            for (long bidderId : new long[]{alice, bob}) {
                pool.submit(() -> {
                    try {
                        start.await();
                        service.placeBid(auctionId, bidderId, 110);
                        wins.incrementAndGet();
                    } catch (BidTooLowException expected) {
                        // the loser — exactly right
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

            assertEquals(1, wins.get(), "round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }

    @Test
    @DisplayName("simRace (via the isolated sandbox) also settles equal-amount concurrent bids to exactly one winner")
    void simRace_equalAmountSettlesToOneWinner() throws InterruptedException {
        AuctionService service = newService();
        var reset = service.simReset();
        @SuppressWarnings("unchecked")
        List<Auction> auctions = (List<Auction>) reset.get("auctions");
        long activeAuctionId = auctions.stream()
                .filter(a -> a.getStatus() == com.lld.auction.model.AuctionStatus.ACTIVE)
                .findFirst().orElseThrow().getId();

        var raced = service.simRace(activeAuctionId, 10, 5);
        @SuppressWarnings("unchecked")
        var race = (java.util.Map<String, Object>) raced.get("race");
        assertEquals(1, race.get("succeeded"));
        assertEquals(9, race.get("rejected"));
    }
}
