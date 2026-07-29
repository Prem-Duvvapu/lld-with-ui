package com.lld.auction.model;

public class Bid {
    private static long idCounter = 0;
    private final long id;
    private final long auctionId;
    private final long bidderId;
    private final double amount;
    private final long timestamp;

    public Bid(long auctionId, long bidderId, double amount) {
        this.id = ++idCounter;
        this.auctionId = auctionId;
        this.bidderId = bidderId;
        this.amount = amount;
        this.timestamp = System.currentTimeMillis();
    }

    public long getId() { return id; }
    public long getAuctionId() { return auctionId; }
    public long getBidderId() { return bidderId; }
    public double getAmount() { return amount; }
    public long getTimestamp() { return timestamp; }
}