package com.lld.auction.config;

import com.lld.auction.model.Auction;
import com.lld.auction.model.AuctionStatus;
import com.lld.auction.model.Bidder;
import com.lld.auction.repository.AuctionRepository;
import com.lld.auction.strategy.BidIncrementPolicy;

/**
 * Builds demo seed data for one {@link AuctionRepository} instance. A plain static helper (no
 * Spring lifecycle of its own) so both the live repository and every fresh sim-sandbox
 * repository can call it identically — the same "one seeding routine, two callers" shape as
 * {@code TrafficSignalInitializer.buildFourWayIntersection}.
 */
public final class AuctionInitializer {

    private AuctionInitializer() {
    }

    /** Seeds three demo bidders and returns them in creation order. */
    public static Bidder[] seedBidders(AuctionRepository repo) {
        Bidder alice = Bidder.builder().id(repo.nextBidderId()).name("Alice").email("alice@example.com").build();
        Bidder bob = Bidder.builder().id(repo.nextBidderId()).name("Bob").email("bob@example.com").build();
        Bidder charlie = Bidder.builder().id(repo.nextBidderId()).name("Charlie").email("charlie@example.com").build();
        repo.saveBidder(alice);
        repo.saveBidder(bob);
        repo.saveBidder(charlie);
        return new Bidder[]{alice, bob, charlie};
    }

    /**
     * Seeds four demo auctions spanning both increment strategies and every lifecycle state:
     * two ACTIVE (one FIXED, one PERCENTAGE — so the sim tab can demo both
     * {@link com.lld.auction.strategy.BidIncrementStrategy} implementations against a live
     * auction), one PENDING (starts in the future — demonstrates
     * {@link com.lld.auction.exception.InvalidAuctionWindowException}), and one already CLOSED
     * (demonstrates {@link com.lld.auction.exception.AuctionClosedException}).
     */
    public static void seedAuctions(AuctionRepository repo, long now) {
        Auction activeFixed = Auction.builder()
                .id(repo.nextAuctionId())
                .itemName("Vintage Guitar")
                .description("1965 sunburst acoustic, single owner, recently restrung.")
                .startingBid(100.0)
                .currentBid(100.0)
                .highestBidderId(null)
                .status(AuctionStatus.ACTIVE)
                .incrementPolicy(BidIncrementPolicy.FIXED)
                .incrementValue(10.0)
                .createdAt(now - 60_000)
                .startTime(now - 60_000)
                .endTime(now + 600_000)
                .build();
        repo.saveAuction(activeFixed);

        Auction activePercentage = Auction.builder()
                .id(repo.nextAuctionId())
                .itemName("Antique Pocket Watch")
                .description("18k gold case, hand-engraved, running order.")
                .startingBid(300.0)
                .currentBid(300.0)
                .highestBidderId(null)
                .status(AuctionStatus.ACTIVE)
                .incrementPolicy(BidIncrementPolicy.PERCENTAGE)
                .incrementValue(5.0)
                .createdAt(now - 60_000)
                .startTime(now - 60_000)
                .endTime(now + 600_000)
                .build();
        repo.saveAuction(activePercentage);

        Auction pending = Auction.builder()
                .id(repo.nextAuctionId())
                .itemName("Rare Stamp Collection")
                .description("1930s commemorative set, mint condition, appraised.")
                .startingBid(50.0)
                .currentBid(50.0)
                .highestBidderId(null)
                .status(AuctionStatus.PENDING)
                .incrementPolicy(BidIncrementPolicy.PERCENTAGE)
                .incrementValue(5.0)
                .createdAt(now)
                .startTime(now + 300_000)
                .endTime(now + 1_200_000)
                .build();
        repo.saveAuction(pending);

        Auction closed = Auction.builder()
                .id(repo.nextAuctionId())
                .itemName("Antique Clock")
                .description("Hand-carved mantel clock, working movement.")
                .startingBid(200.0)
                .currentBid(200.0)
                .highestBidderId(null)
                .status(AuctionStatus.CLOSED)
                .incrementPolicy(BidIncrementPolicy.FIXED)
                .incrementValue(20.0)
                .createdAt(now - 7_200_000)
                .startTime(now - 7_200_000)
                .endTime(now - 3_600_000)
                .build();
        repo.saveAuction(closed);
    }
}
