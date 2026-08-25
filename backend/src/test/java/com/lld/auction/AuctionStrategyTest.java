package com.lld.auction;

import com.lld.auction.model.Auction;
import com.lld.auction.model.AuctionStatus;
import com.lld.auction.strategy.BidIncrementPolicy;
import com.lld.auction.strategy.BidIncrementStrategy;
import com.lld.auction.strategy.BidIncrementStrategyFactory;
import com.lld.auction.strategy.FixedIncrementStrategy;
import com.lld.auction.strategy.PercentageIncrementStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Pins the exact minimum-next-bid arithmetic for each {@link BidIncrementStrategy}. */
class AuctionStrategyTest {

    private Auction auction(double currentBid, BidIncrementPolicy policy, double incrementValue) {
        return Auction.builder()
                .id(1).itemName("Test Item").startingBid(currentBid).currentBid(currentBid)
                .status(AuctionStatus.ACTIVE).incrementPolicy(policy).incrementValue(incrementValue)
                .createdAt(0).startTime(0).endTime(Long.MAX_VALUE)
                .build();
    }

    // ------------------------------------------------------------- Fixed

    @Test
    @DisplayName("FixedIncrement requires exactly currentBid + incrementValue")
    void fixed_addsFlatAmount() {
        FixedIncrementStrategy strategy = new FixedIncrementStrategy();
        assertEquals(110.0, strategy.minNextBid(auction(100.0, BidIncrementPolicy.FIXED, 10.0)), 0.0001);
        assertEquals(25.0, strategy.minNextBid(auction(20.0, BidIncrementPolicy.FIXED, 5.0)), 0.0001);
    }

    @Test
    @DisplayName("FixedIncrement name is stable for UI/audit display")
    void fixed_name() {
        assertEquals("FixedIncrement", new FixedIncrementStrategy().name());
    }

    // -------------------------------------------------------- Percentage

    @Test
    @DisplayName("PercentageIncrement requires currentBid * (1 + pct/100), rounded to 2dp")
    void percentage_multipliesByPercent() {
        PercentageIncrementStrategy strategy = new PercentageIncrementStrategy();
        // 100 * 1.05 = 105.0
        assertEquals(105.0, strategy.minNextBid(auction(100.0, BidIncrementPolicy.PERCENTAGE, 5.0)), 0.0001);
        // 33 * 1.10 = 36.3
        assertEquals(36.3, strategy.minNextBid(auction(33.0, BidIncrementPolicy.PERCENTAGE, 10.0)), 0.0001);
    }

    @Test
    @DisplayName("PercentageIncrement rounds to the nearest cent")
    void percentage_roundsToTwoDecimals() {
        PercentageIncrementStrategy strategy = new PercentageIncrementStrategy();
        // 99.99 * 1.05 = 104.9895 -> rounds to 104.99
        assertEquals(104.99, strategy.minNextBid(auction(99.99, BidIncrementPolicy.PERCENTAGE, 5.0)), 0.0001);
    }

    @Test
    @DisplayName("PercentageIncrement name is stable for UI/audit display")
    void percentage_name() {
        assertEquals("PercentageIncrement", new PercentageIncrementStrategy().name());
    }

    // ------------------------------------------------------------ Factory

    @Test
    @DisplayName("Factory resolves every declared policy to its matching strategy")
    void factory_resolvesEveryPolicy() {
        BidIncrementStrategyFactory factory =
                new BidIncrementStrategyFactory(new FixedIncrementStrategy(), new PercentageIncrementStrategy());

        assertInstanceOf(FixedIncrementStrategy.class, factory.forPolicy(BidIncrementPolicy.FIXED));
        assertInstanceOf(PercentageIncrementStrategy.class, factory.forPolicy(BidIncrementPolicy.PERCENTAGE));
    }

    @Test
    @DisplayName("Factory returns null for a null policy — the service treats this as unknown, not a default")
    void factory_returnsNullForNullPolicy() {
        BidIncrementStrategyFactory factory =
                new BidIncrementStrategyFactory(new FixedIncrementStrategy(), new PercentageIncrementStrategy());
        assertNull(factory.forPolicy(null));
    }
}
