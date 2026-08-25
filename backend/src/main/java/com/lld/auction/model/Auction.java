package com.lld.auction.model;

import com.lld.auction.strategy.BidIncrementPolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * An item up for bid. {@code currentBid} and {@code highestBidderId} are the only fields a
 * concurrent bid mutates; every mutation happens under the per-auction lock held by
 * {@link com.lld.auction.service.AuctionService}, so reading them while holding that same lock
 * always observes the latest accepted bid — the fix for the classic check-then-act race where
 * two bidders could otherwise both believe they are leading.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Auction {
    private long id;
    private String itemName;
    private String description;
    private double startingBid;
    private double currentBid;
    private Long highestBidderId;
    private AuctionStatus status;
    private BidIncrementPolicy incrementPolicy;
    /** FIXED: absolute currency amount. PERCENTAGE: whole percent (5 == 5%). */
    private double incrementValue;
    private long createdAt;
    private long startTime;
    private long endTime;

    /** True once wall-clock time has reached the scheduled start, regardless of the cached {@link #status}. */
    public boolean hasStarted(long now) {
        return now >= startTime;
    }

    /** True once wall-clock time has passed the scheduled end, regardless of the cached {@link #status}. */
    public boolean hasEnded(long now) {
        return now >= endTime;
    }
}
