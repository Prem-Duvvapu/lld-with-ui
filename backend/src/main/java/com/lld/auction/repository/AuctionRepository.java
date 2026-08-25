package com.lld.auction.repository;

import com.lld.auction.model.Auction;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory store for auctions, bidders and bids. Each id space has its own {@link AtomicLong}
 * generator (no shared static counter on the model classes, so a live instance and a fresh
 * sim-sandbox instance both start their own ids at 1 without racing each other for one counter).
 */
@Repository
public class AuctionRepository {

    private final Map<Long, Auction> auctions = new ConcurrentHashMap<>();
    private final Map<Long, Bidder> bidders = new ConcurrentHashMap<>();
    private final Map<Long, Bid> bids = new ConcurrentHashMap<>();

    private final AtomicLong auctionIdGen = new AtomicLong(1);
    private final AtomicLong bidderIdGen = new AtomicLong(1);
    private final AtomicLong bidIdGen = new AtomicLong(1);

    public long nextAuctionId() { return auctionIdGen.getAndIncrement(); }
    public long nextBidderId() { return bidderIdGen.getAndIncrement(); }
    public long nextBidId() { return bidIdGen.getAndIncrement(); }

    public void saveAuction(Auction auction) {
        auctions.put(auction.getId(), auction);
    }

    public Auction getAuction(long id) {
        return auctions.get(id);
    }

    public List<Auction> getAllAuctions() {
        List<Auction> list = new ArrayList<>(auctions.values());
        list.sort(Comparator.comparingLong(Auction::getId).reversed());
        return list;
    }

    public void updateAuction(Auction auction) {
        auctions.put(auction.getId(), auction);
    }

    public Collection<Auction> getAllAuctionsRaw() {
        return auctions.values();
    }

    public void saveBidder(Bidder bidder) {
        bidders.put(bidder.getId(), bidder);
    }

    public Bidder getBidder(long id) {
        return bidders.get(id);
    }

    public List<Bidder> getAllBidders() {
        return new ArrayList<>(bidders.values());
    }

    public void saveBid(Bid bid) {
        bids.put(bid.getId(), bid);
    }

    public List<Bid> getBidsForAuction(long auctionId) {
        List<Bid> result = new ArrayList<>();
        for (Bid bid : bids.values()) {
            if (bid.getAuctionId() == auctionId) {
                result.add(bid);
            }
        }
        result.sort(Comparator.comparingLong(Bid::getTimestamp).reversed());
        return result;
    }
}
