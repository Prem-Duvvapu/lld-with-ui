package com.lld.auction.repository;

import com.lld.auction.model.Auction;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class AuctionRepository {

    private final Map<Long, Auction> auctions = new ConcurrentHashMap<>();
    private final Map<Long, Bidder> bidders = new ConcurrentHashMap<>();
    private final Map<Long, Bid> bids = new ConcurrentHashMap<>();

    public void saveAuction(Auction auction) {
        auctions.put(auction.getId(), auction);
    }

    public Auction getAuction(Long id) {
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

    public void saveBidder(Bidder bidder) {
        bidders.put(bidder.getId(), bidder);
    }

    public Bidder getBidder(Long id) {
        return bidders.get(id);
    }

    public List<Bidder> getAllBidders() {
        return new ArrayList<>(bidders.values());
    }

    public void saveBid(Bid bid) {
        bids.put(bid.getId(), bid);
    }

    public List<Bid> getBidsForAuction(Long auctionId) {
        List<Bid> result = new ArrayList<>();
        for (Bid bid : bids.values()) {
            if (bid.getAuctionId() == auctionId) {
                result.add(bid);
            }
        }
        result.sort(Comparator.comparingLong(Bid::getTimestamp).reversed());
        return result;
    }

    public Collection<Auction> getAllAuctionsRaw() {
        return auctions.values();
    }
}