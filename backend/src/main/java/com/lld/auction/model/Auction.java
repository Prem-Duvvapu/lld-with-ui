package com.lld.auction.model;

public class Auction {
    private static long idCounter = 0;
    private final long id;
    private final String itemName;
    private final String description;
    private final double startingBid;
    private double currentBid;
    private Long highestBidderId;
    private AuctionStatus status;
    private final long createdAt;
    private final long endTime;

    public Auction(String itemName, String description, double startingBid, long durationMinutes) {
        this.id = ++idCounter;
        this.itemName = itemName;
        this.description = description;
        this.startingBid = startingBid;
        this.currentBid = startingBid;
        this.highestBidderId = null;
        this.status = AuctionStatus.PENDING;
        this.createdAt = System.currentTimeMillis();
        this.endTime = this.createdAt + durationMinutes * 60 * 1000;
    }

    public long getId() { return id; }
    public String getItemName() { return itemName; }
    public String getDescription() { return description; }
    public double getStartingBid() { return startingBid; }
    public double getCurrentBid() { return currentBid; }
    public void setCurrentBid(double currentBid) { this.currentBid = currentBid; }
    public Long getHighestBidderId() { return highestBidderId; }
    public void setHighestBidderId(Long highestBidderId) { this.highestBidderId = highestBidderId; }
    public AuctionStatus getStatus() { return status; }
    public void setStatus(AuctionStatus status) { this.status = status; }
    public long getCreatedAt() { return createdAt; }
    public long getEndTime() { return endTime; }
}