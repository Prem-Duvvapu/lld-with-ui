package com.lld.auction;

import com.lld.auction.config.AuctionInitializer;
import com.lld.auction.model.Auction;
import com.lld.auction.model.AuctionStatus;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import com.lld.auction.repository.AuctionRepository;
import com.lld.auction.strategy.BidIncrementPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AuctionRepositoryTest {

    private AuctionRepository repository;

    @BeforeEach
    void setUp() {
        repository = new AuctionRepository();
    }

    // ------------------------------------------------------------------ ids

    @Test
    @DisplayName("Auction, bidder and bid ids are generated atomically, starting at 1, and never repeat")
    void idsAreAtomicAndUnique() {
        assertEquals(1, repository.nextAuctionId());
        assertEquals(2, repository.nextAuctionId());

        assertEquals(1, repository.nextBidderId());
        assertEquals(2, repository.nextBidderId());

        assertEquals(1, repository.nextBidId());
        assertEquals(2, repository.nextBidId());
    }

    // ------------------------------------------------------------- auctions

    @Test
    @DisplayName("saveAuction then getAuction round-trips; unknown id returns null")
    void auctionRoundTrip() {
        Auction auction = Auction.builder().id(repository.nextAuctionId()).itemName("Lamp")
                .startingBid(10).currentBid(10).status(AuctionStatus.ACTIVE)
                .incrementPolicy(BidIncrementPolicy.FIXED).incrementValue(1)
                .createdAt(0).startTime(0).endTime(Long.MAX_VALUE).build();
        repository.saveAuction(auction);

        assertEquals("Lamp", repository.getAuction(auction.getId()).getItemName());
        assertNull(repository.getAuction(999_999));
    }

    @Test
    @DisplayName("updateAuction overwrites the stored auction for that id")
    void updateAuctionOverwrites() {
        Auction auction = Auction.builder().id(repository.nextAuctionId()).itemName("Lamp")
                .startingBid(10).currentBid(10).status(AuctionStatus.ACTIVE)
                .incrementPolicy(BidIncrementPolicy.FIXED).incrementValue(1)
                .createdAt(0).startTime(0).endTime(Long.MAX_VALUE).build();
        repository.saveAuction(auction);

        auction.setCurrentBid(999.0);
        repository.updateAuction(auction);

        assertEquals(999.0, repository.getAuction(auction.getId()).getCurrentBid(), 0.0001);
    }

    @Test
    @DisplayName("getAllAuctions returns newest-first (descending by id)")
    void getAllAuctionsSortsDescendingById() {
        for (int i = 0; i < 3; i++) {
            repository.saveAuction(Auction.builder().id(repository.nextAuctionId()).itemName("Item " + i)
                    .startingBid(10).currentBid(10).status(AuctionStatus.ACTIVE)
                    .incrementPolicy(BidIncrementPolicy.FIXED).incrementValue(1)
                    .createdAt(0).startTime(0).endTime(Long.MAX_VALUE).build());
        }
        List<Auction> all = repository.getAllAuctions();
        assertEquals(3, all.size());
        for (int i = 1; i < all.size(); i++) {
            assertTrue(all.get(i - 1).getId() > all.get(i).getId());
        }
    }

    // -------------------------------------------------------------- bidders

    @Test
    @DisplayName("saveBidder then getBidder round-trips; unknown id returns null")
    void bidderRoundTrip() {
        Bidder bidder = Bidder.builder().id(repository.nextBidderId()).name("Alice").email("alice@x.com").build();
        repository.saveBidder(bidder);

        assertEquals("Alice", repository.getBidder(bidder.getId()).getName());
        assertNull(repository.getBidder(999_999));
    }

    @Test
    @DisplayName("getAllBidders returns every registered bidder")
    void getAllBiddersReturnsAll() {
        repository.saveBidder(Bidder.builder().id(repository.nextBidderId()).name("A").email("a@x.com").build());
        repository.saveBidder(Bidder.builder().id(repository.nextBidderId()).name("B").email("b@x.com").build());
        assertEquals(2, repository.getAllBidders().size());
    }

    // ------------------------------------------------------------------ bids

    @Test
    @DisplayName("getBidsForAuction returns only bids for that auction, newest-first")
    void getBidsForAuctionFiltersAndSorts() {
        long auctionId = repository.nextAuctionId();
        long otherAuctionId = repository.nextAuctionId();

        repository.saveBid(Bid.builder().id(repository.nextBidId()).auctionId(auctionId)
                .bidderId(1).amount(100).timestamp(1000).build());
        repository.saveBid(Bid.builder().id(repository.nextBidId()).auctionId(auctionId)
                .bidderId(2).amount(110).timestamp(2000).build());
        repository.saveBid(Bid.builder().id(repository.nextBidId()).auctionId(otherAuctionId)
                .bidderId(3).amount(50).timestamp(1500).build());

        List<Bid> bids = repository.getBidsForAuction(auctionId);
        assertEquals(2, bids.size());
        assertEquals(2000, bids.get(0).getTimestamp(), "newest bid first");
        assertEquals(1000, bids.get(1).getTimestamp());
    }

    @Test
    @DisplayName("getBidsForAuction returns empty, not null, for an auction with no bids")
    void getBidsForAuctionEmptyWhenNone() {
        assertTrue(repository.getBidsForAuction(999_999).isEmpty());
    }

    // ---------------------------------------------------------- initializer

    @Test
    @DisplayName("AuctionInitializer seeds 3 bidders")
    void initializerSeedsBidders() {
        Bidder[] bidders = AuctionInitializer.seedBidders(repository);
        assertEquals(3, bidders.length);
        assertEquals(3, repository.getAllBidders().size());
    }

    @Test
    @DisplayName("AuctionInitializer seeds every lifecycle state and both increment policies")
    void initializerSeedsAuctionsAcrossLifecycleStates() {
        long now = System.currentTimeMillis();
        AuctionInitializer.seedAuctions(repository, now);

        List<Auction> all = repository.getAllAuctions();
        assertEquals(4, all.size());
        assertTrue(all.stream().anyMatch(a -> a.getStatus() == AuctionStatus.ACTIVE
                && a.getIncrementPolicy() == BidIncrementPolicy.FIXED));
        assertTrue(all.stream().anyMatch(a -> a.getStatus() == AuctionStatus.ACTIVE
                && a.getIncrementPolicy() == BidIncrementPolicy.PERCENTAGE));
        assertTrue(all.stream().anyMatch(a -> a.getStatus() == AuctionStatus.PENDING));
        assertTrue(all.stream().anyMatch(a -> a.getStatus() == AuctionStatus.CLOSED));
    }
}
