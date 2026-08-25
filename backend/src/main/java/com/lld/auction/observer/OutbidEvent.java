package com.lld.auction.observer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Published by {@link AuctionNotifier} whenever a new bid supersedes the previous leading bid. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutbidEvent {
    private long auctionId;
    private String itemName;
    private long previousBidderId;
    private String previousBidderName;
    private double previousAmount;
    private long newBidderId;
    private String newBidderName;
    private double newAmount;
    private long timestamp;
    private String message;
}
