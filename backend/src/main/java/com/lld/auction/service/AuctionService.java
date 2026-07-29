package com.lld.auction.service;

import com.lld.auction.model.Auction;
import com.lld.auction.model.AuctionStatus;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import com.lld.auction.repository.AuctionRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class AuctionService {

    private final AuctionRepository repository;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public AuctionService(AuctionRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void startAutoCloseScheduler() {
        scheduler.scheduleAtFixedRate(this::autoCloseAuctions, 0, 5, TimeUnit.SECONDS);
    }

    public Auction createAuction(String itemName, String description, double startingBid, long durationMinutes) {
        if (startingBid <= 0) throw new IllegalArgumentException("Starting bid must be positive");
        if (durationMinutes <= 0) throw new IllegalArgumentException("Duration must be positive");
        Auction auction = new Auction(itemName, description, startingBid, durationMinutes);
        repository.saveAuction(auction);
        return auction;
    }

    public Bidder registerBidder(String name, String email) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Name is required");
        if (email == null || email.isBlank()) throw new IllegalArgumentException("Email is required");
        Bidder bidder = new Bidder(name, email);
        repository.saveBidder(bidder);
        return bidder;
    }

    public Bid placeBid(long auctionId, long bidderId, double amount) {
        Auction auction = repository.getAuction(auctionId);
        if (auction == null) throw new IllegalArgumentException("Auction not found");
        if (auction.getStatus() != AuctionStatus.ACTIVE) throw new IllegalStateException("Auction is not active");
        if (repository.getBidder(bidderId) == null) throw new IllegalArgumentException("Bidder not found");
        if (amount <= auction.getCurrentBid()) throw new IllegalArgumentException("Bid must be higher than current bid of " + auction.getCurrentBid());

        auction.setCurrentBid(amount);
        auction.setHighestBidderId(bidderId);
        repository.updateAuction(auction);

        Bid bid = new Bid(auctionId, bidderId, amount);
        repository.saveBid(bid);
        return bid;
    }

    public Auction getAuction(long auctionId) {
        Auction auction = repository.getAuction(auctionId);
        if (auction == null) throw new IllegalArgumentException("Auction not found");
        return auction;
    }

    public List<Auction> getAllAuctions() {
        return repository.getAllAuctions();
    }

    public Auction closeAuction(long auctionId) {
        Auction auction = repository.getAuction(auctionId);
        if (auction == null) throw new IllegalArgumentException("Auction not found");
        if (auction.getStatus() == AuctionStatus.CLOSED) throw new IllegalStateException("Auction is already closed");
        auction.setStatus(AuctionStatus.CLOSED);
        repository.updateAuction(auction);
        return auction;
    }

    public List<Bid> getBidsForAuction(long auctionId) {
        if (repository.getAuction(auctionId) == null) throw new IllegalArgumentException("Auction not found");
        return repository.getBidsForAuction(auctionId);
    }

    public List<Bidder> getAllBidders() {
        return repository.getAllBidders();
    }

    private void autoCloseAuctions() {
        long now = System.currentTimeMillis();
        for (Auction auction : repository.getAllAuctionsRaw()) {
            if (auction.getStatus() == AuctionStatus.PENDING && now >= auction.getCreatedAt()) {
                auction.setStatus(AuctionStatus.ACTIVE);
                repository.updateAuction(auction);
            }
            if (auction.getStatus() == AuctionStatus.ACTIVE && now >= auction.getEndTime()) {
                auction.setStatus(AuctionStatus.CLOSED);
                repository.updateAuction(auction);
            }
        }
    }
}