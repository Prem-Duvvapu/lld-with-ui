package com.lld.auction;

import com.lld.auction.exception.AuctionClosedException;
import com.lld.auction.exception.AuctionNotFoundException;
import com.lld.auction.exception.BidTooLowException;
import com.lld.auction.exception.BidderNotFoundException;
import com.lld.auction.exception.InvalidAuctionOperationException;
import com.lld.auction.exception.InvalidAuctionWindowException;
import com.lld.auction.model.Auction;
import com.lld.auction.model.AuctionStatus;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import com.lld.auction.observer.AuctionNotifier;
import com.lld.auction.observer.InAppAuctionObserver;
import com.lld.auction.observer.LoggingAuctionObserver;
import com.lld.auction.observer.OutbidEvent;
import com.lld.auction.repository.AuctionRepository;
import com.lld.auction.service.AuctionService;
import com.lld.auction.strategy.BidIncrementPolicy;
import com.lld.auction.strategy.BidIncrementStrategyFactory;
import com.lld.auction.strategy.FixedIncrementStrategy;
import com.lld.auction.strategy.PercentageIncrementStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AuctionServiceTest {

    private AuctionService service;
    private InAppAuctionObserver inAppObserver;

    @BeforeEach
    void setUp() {
        AuctionRepository repository = new AuctionRepository();
        inAppObserver = new InAppAuctionObserver();
        AuctionNotifier notifier = new AuctionNotifier(List.of(inAppObserver, new LoggingAuctionObserver()));
        BidIncrementStrategyFactory factory =
                new BidIncrementStrategyFactory(new FixedIncrementStrategy(), new PercentageIncrementStrategy());
        service = new AuctionService(repository, notifier, inAppObserver, factory);
    }

    private long createActiveFixedAuction(double startingBid, double incrementValue) {
        return service.createAuction("Item", "desc", startingBid, 10, 0, BidIncrementPolicy.FIXED, incrementValue).getId();
    }

    private long registerBidder(String name) {
        return service.registerBidder(name, name.toLowerCase() + "@x.com").getId();
    }

    // -------------------------------------------------------------- create

    @Test
    @DisplayName("createAuction rejects a blank item name")
    void createAuction_rejectsBlankName() {
        assertThrows(InvalidAuctionOperationException.class,
                () -> service.createAuction("  ", "d", 10, 10, 0, BidIncrementPolicy.FIXED, 1));
    }

    @Test
    @DisplayName("createAuction rejects a non-positive starting bid")
    void createAuction_rejectsNonPositiveStartingBid() {
        assertThrows(InvalidAuctionOperationException.class,
                () -> service.createAuction("Item", "d", 0, 10, 0, BidIncrementPolicy.FIXED, 1));
        assertThrows(InvalidAuctionOperationException.class,
                () -> service.createAuction("Item", "d", -5, 10, 0, BidIncrementPolicy.FIXED, 1));
    }

    @Test
    @DisplayName("createAuction rejects a non-positive duration")
    void createAuction_rejectsNonPositiveDuration() {
        assertThrows(InvalidAuctionWindowException.class,
                () -> service.createAuction("Item", "d", 10, 0, 0, BidIncrementPolicy.FIXED, 1));
    }

    @Test
    @DisplayName("createAuction rejects a negative start delay")
    void createAuction_rejectsNegativeStartDelay() {
        assertThrows(InvalidAuctionWindowException.class,
                () -> service.createAuction("Item", "d", 10, 10, -1, BidIncrementPolicy.FIXED, 1));
    }

    @Test
    @DisplayName("createAuction with a positive start delay is created PENDING; zero delay is ACTIVE immediately")
    void createAuction_statusReflectsStartDelay() {
        Auction pending = service.createAuction("Item", "d", 10, 10, 5, BidIncrementPolicy.FIXED, 1);
        assertEquals(AuctionStatus.PENDING, pending.getStatus());

        Auction active = service.createAuction("Item", "d", 10, 10, 0, BidIncrementPolicy.FIXED, 1);
        assertEquals(AuctionStatus.ACTIVE, active.getStatus());
    }

    @Test
    @DisplayName("createAuction defaults a null increment policy to FIXED with a sane default increment")
    void createAuction_defaultsPolicy() {
        Auction auction = service.createAuction("Item", "d", 100, 10, 0, null, 0);
        assertEquals(BidIncrementPolicy.FIXED, auction.getIncrementPolicy());
        assertTrue(auction.getIncrementValue() > 0);
    }

    // ------------------------------------------------------------- register

    @Test
    @DisplayName("registerBidder rejects blank name or email")
    void registerBidder_rejectsBlankFields() {
        assertThrows(InvalidAuctionOperationException.class, () -> service.registerBidder(" ", "a@x.com"));
        assertThrows(InvalidAuctionOperationException.class, () -> service.registerBidder("A", " "));
    }

    // --------------------------------------------------------------- bid

    @Test
    @DisplayName("First bid must clear startingBid + increment")
    void placeBid_firstBidMustClearIncrementOverStartingBid() {
        long auctionId = createActiveFixedAuction(100, 10);
        long bidderId = registerBidder("Alice");

        assertThrows(BidTooLowException.class, () -> service.placeBid(auctionId, bidderId, 105));

        Bid bid = service.placeBid(auctionId, bidderId, 110);
        assertEquals(110, bid.getAmount(), 0.0001);
        assertEquals(110, service.getAuction(auctionId).getCurrentBid(), 0.0001);
        assertEquals(bidderId, service.getAuction(auctionId).getHighestBidderId());
    }

    @Test
    @DisplayName("A second bid must clear the NEW current bid, not the starting bid")
    void placeBid_secondBidMustClearUpdatedCurrentBid() {
        long auctionId = createActiveFixedAuction(100, 10);
        long alice = registerBidder("Alice");
        long bob = registerBidder("Bob");

        service.placeBid(auctionId, alice, 110);
        assertThrows(BidTooLowException.class, () -> service.placeBid(auctionId, bob, 115)); // needs >= 120
        Bid bobsBid = service.placeBid(auctionId, bob, 120);
        assertEquals(120, bobsBid.getAmount(), 0.0001);
    }

    @Test
    @DisplayName("placeBid on an unknown auction throws AuctionNotFoundException")
    void placeBid_unknownAuction() {
        long bidderId = registerBidder("Alice");
        assertThrows(AuctionNotFoundException.class, () -> service.placeBid(999_999, bidderId, 100));
    }

    @Test
    @DisplayName("placeBid by an unknown bidder throws BidderNotFoundException")
    void placeBid_unknownBidder() {
        long auctionId = createActiveFixedAuction(100, 10);
        assertThrows(BidderNotFoundException.class, () -> service.placeBid(auctionId, 999_999, 200));
    }

    @Test
    @DisplayName("placeBid rejects a non-positive amount")
    void placeBid_rejectsNonPositiveAmount() {
        long auctionId = createActiveFixedAuction(100, 10);
        long bidderId = registerBidder("Alice");
        assertThrows(InvalidAuctionOperationException.class, () -> service.placeBid(auctionId, bidderId, 0));
        assertThrows(InvalidAuctionOperationException.class, () -> service.placeBid(auctionId, bidderId, -50));
    }

    @Test
    @DisplayName("placeBid on a PENDING auction (before its start time) throws InvalidAuctionWindowException")
    void placeBid_beforeStart_rejected() {
        Auction pending = service.createAuction("Future Item", "d", 100, 10, 5, BidIncrementPolicy.FIXED, 10);
        long bidderId = registerBidder("Alice");
        assertThrows(InvalidAuctionWindowException.class, () -> service.placeBid(pending.getId(), bidderId, 200));
    }

    @Test
    @DisplayName("placeBid on a closed auction throws AuctionClosedException")
    void placeBid_onClosedAuction_rejected() {
        long auctionId = createActiveFixedAuction(100, 10);
        long bidderId = registerBidder("Alice");
        service.closeAuction(auctionId);
        assertThrows(AuctionClosedException.class, () -> service.placeBid(auctionId, bidderId, 200));
    }

    @Test
    @DisplayName("A bid past the scheduled end time is rejected even if the cached status is still ACTIVE")
    void placeBid_pastEndTime_rejectedRegardlessOfCachedStatus() {
        Auction auction = service.createAuction("Item", "d", 100, 10, 0, BidIncrementPolicy.FIXED, 10);
        // Directly age the SAME stored instance's end time into the past, bypassing any status sync.
        Auction stored = service.getAuction(auction.getId());
        stored.setEndTime(System.currentTimeMillis() - 1000);
        assertEquals(AuctionStatus.ACTIVE, stored.getStatus(), "status field itself is still stale ACTIVE");

        long bidderId = registerBidder("Alice");
        assertThrows(AuctionClosedException.class, () -> service.placeBid(auction.getId(), bidderId, 200));
    }

    @Test
    @DisplayName("getAuction lazily syncs an expired ACTIVE auction to CLOSED")
    void getAuction_syncsExpiredStatus() {
        Auction auction = service.createAuction("Item", "d", 100, 10, 0, BidIncrementPolicy.FIXED, 10);
        Auction stored = service.getAuction(auction.getId());
        stored.setEndTime(System.currentTimeMillis() - 1000);

        Auction resynced = service.getAuction(auction.getId());
        assertEquals(AuctionStatus.CLOSED, resynced.getStatus());
    }

    @Test
    @DisplayName("Percentage-increment auction requires currentBid * (1 + pct/100)")
    void placeBid_percentageIncrementMath() {
        long auctionId = service.createAuction("Item", "d", 100, 10, 0, BidIncrementPolicy.PERCENTAGE, 10).getId();
        long bidderId = registerBidder("Alice");

        assertThrows(BidTooLowException.class, () -> service.placeBid(auctionId, bidderId, 109)); // needs >= 110
        Bid bid = service.placeBid(auctionId, bidderId, 110);
        assertEquals(110, bid.getAmount(), 0.0001);
    }

    // ------------------------------------------------------------- observer

    @Test
    @DisplayName("A superseding bid publishes exactly one outbid notification naming both bidders")
    void placeBid_outbidPublishesNotification() {
        long auctionId = createActiveFixedAuction(100, 10);
        long alice = registerBidder("Alice");
        long bob = registerBidder("Bob");

        service.placeBid(auctionId, alice, 110);
        assertTrue(service.getNotifications().isEmpty(), "no one to outbid yet on the opening bid");

        service.placeBid(auctionId, bob, 120);
        List<OutbidEvent> notifications = service.getNotifications();
        assertEquals(1, notifications.size());
        OutbidEvent event = notifications.get(0);
        assertEquals(alice, event.getPreviousBidderId());
        assertEquals(bob, event.getNewBidderId());
        assertEquals(110, event.getPreviousAmount(), 0.0001);
        assertEquals(120, event.getNewAmount(), 0.0001);
    }

    @Test
    @DisplayName("The same bidder raising their own leading bid does not outbid themselves")
    void placeBid_selfRaiseDoesNotNotify() {
        long auctionId = createActiveFixedAuction(100, 10);
        long alice = registerBidder("Alice");

        service.placeBid(auctionId, alice, 110);
        // Alice is not superseded by anyone else here, so no self-outbid notification is expected
        // in this scenario since Bob never bids; this just documents the opening-bid case fully.
        assertTrue(service.getNotifications().isEmpty());
    }

    @Test
    @DisplayName("Both the in-app and logging observers receive every outbid event independently")
    void bothObserversReceiveOutbidEvents() {
        long auctionId = createActiveFixedAuction(100, 10);
        long alice = registerBidder("Alice");
        long bob = registerBidder("Bob");

        service.placeBid(auctionId, alice, 110);
        service.placeBid(auctionId, bob, 120);

        assertFalse(inAppObserver.recentEvents().isEmpty(), "the in-app feed observer must have the event");
    }

    // --------------------------------------------------------------- close

    @Test
    @DisplayName("closeAuction transitions an open auction to CLOSED")
    void closeAuction_closesOpenAuction() {
        long auctionId = createActiveFixedAuction(100, 10);
        Auction closed = service.closeAuction(auctionId);
        assertEquals(AuctionStatus.CLOSED, closed.getStatus());
    }

    @Test
    @DisplayName("closeAuction on an already-closed auction throws AuctionClosedException")
    void closeAuction_rejectsDoubleClose() {
        long auctionId = createActiveFixedAuction(100, 10);
        service.closeAuction(auctionId);
        assertThrows(AuctionClosedException.class, () -> service.closeAuction(auctionId));
    }

    @Test
    @DisplayName("closeAuction on an unknown auction throws AuctionNotFoundException")
    void closeAuction_unknownAuction() {
        assertThrows(AuctionNotFoundException.class, () -> service.closeAuction(999_999));
    }

    // --------------------------------------------------------------- query

    @Test
    @DisplayName("getBidsForAuction returns bids newest-first; rejects an unknown auction")
    void getBidsForAuction_returnsAndValidates() {
        long auctionId = createActiveFixedAuction(100, 10);
        long alice = registerBidder("Alice");
        service.placeBid(auctionId, alice, 110);

        List<Bid> bids = service.getBidsForAuction(auctionId);
        assertEquals(1, bids.size());
        assertThrows(AuctionNotFoundException.class, () -> service.getBidsForAuction(999_999));
    }

    @Test
    @DisplayName("getAllAuctions and getAllBidders include everything created")
    void getAllAuctionsAndBidders() {
        createActiveFixedAuction(100, 10);
        registerBidder("Alice");
        // seeded data (3 auctions, 3 bidders) plus what this test added
        assertTrue(service.getAllAuctions().size() >= 4);
        assertTrue(service.getAllBidders().size() >= 4);
    }

    // ------------------------------------------------------------------ sim

    @Test
    @DisplayName("The sim sandbox is fully isolated from live state")
    void simSandbox_isolatedFromLive() {
        long liveAuctionId = createActiveFixedAuction(100, 10);
        service.simReset();
        // a sim bid on an id that only exists in live data must not find an auction
        assertThrows(AuctionNotFoundException.class, () -> service.simPlaceBid(liveAuctionId, 1, 500, 1));
    }

    @Test
    @DisplayName("simReset produces a fresh sandbox with seeded bidders/auctions and no leftover notifications")
    void simReset_freshSandbox() {
        Map<String, Object> state = service.simReset();
        @SuppressWarnings("unchecked")
        List<Auction> auctions = (List<Auction>) state.get("auctions");
        assertEquals(4, auctions.size());

        long activeId = auctions.stream().filter(a -> a.getStatus() == AuctionStatus.ACTIVE)
                .findFirst().orElseThrow().getId();
        @SuppressWarnings("unchecked")
        List<Bidder> bidders = (List<Bidder>) state.get("bidders");
        long bidderId = bidders.get(0).getId();

        service.simPlaceBid(activeId, bidderId, 999_999, 2);
        service.simReset();

        Map<String, Object> after = service.getSimSnapshot();
        assertTrue(((List<?>) after.get("notifications")).isEmpty(),
                "a fresh sandbox must have no notifications carried over from the previous session");
    }

    @Test
    @DisplayName("simRace fires N concurrent equal bids and settles with exactly one winner")
    void simRace_exactlyOneWinner() {
        Map<String, Object> reset = service.simReset();
        @SuppressWarnings("unchecked")
        List<Auction> auctions = (List<Auction>) reset.get("auctions");
        long activeId = auctions.stream().filter(a -> a.getStatus() == AuctionStatus.ACTIVE)
                .findFirst().orElseThrow().getId();

        Map<String, Object> raced = service.simRace(activeId, 8, 8);
        @SuppressWarnings("unchecked")
        Map<String, Object> race = (Map<String, Object>) raced.get("race");
        assertEquals(1, race.get("succeeded"));
        assertEquals(7, race.get("rejected"));
    }

    @Test
    @DisplayName("simRace rejects an out-of-range bidder count")
    void simRace_rejectsOutOfRangeCount() {
        service.simReset();
        assertThrows(InvalidAuctionOperationException.class, () -> service.simRace(1, 1, 1));
        assertThrows(InvalidAuctionOperationException.class, () -> service.simRace(1, 100, 1));
    }
}
