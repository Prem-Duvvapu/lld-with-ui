package com.lld.auction.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** An accepted bid. Bids are append-only — a rejected attempt (too low, wrong window) never
 *  reaches the repository, so every {@link Bid} on record was, at the moment it was placed,
 *  the auction's new leading bid. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bid {
    private long id;
    private long auctionId;
    private long bidderId;
    private double amount;
    private long timestamp;
}
