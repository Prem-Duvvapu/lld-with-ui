package com.lld.auction.controller;

import com.lld.auction.model.Auction;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import com.lld.auction.service.AuctionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auction")
@CrossOrigin(origins = "*")
public class AuctionController {

    private final AuctionService service;

    public AuctionController(AuctionService service) {
        this.service = service;
    }

    @PostMapping("/auctions")
    public ResponseEntity<?> createAuction(@RequestBody Map<String, Object> request) {
        try {
            String itemName = (String) request.get("itemName");
            String description = (String) request.get("description");
            double startingBid = ((Number) request.get("startingBid")).doubleValue();
            long durationMinutes = ((Number) request.get("durationMinutes")).longValue();
            Auction auction = service.createAuction(itemName, description, startingBid, durationMinutes);
            return ResponseEntity.ok(auction);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/auctions")
    public List<Auction> getAllAuctions() {
        return service.getAllAuctions();
    }

    @GetMapping("/auctions/{id}")
    public ResponseEntity<?> getAuction(@PathVariable long id) {
        try {
            return ResponseEntity.ok(service.getAuction(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bidders")
    public ResponseEntity<?> registerBidder(@RequestBody Map<String, String> request) {
        try {
            String name = request.get("name");
            String email = request.get("email");
            Bidder bidder = service.registerBidder(name, email);
            return ResponseEntity.ok(bidder);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/bidders")
    public List<Bidder> getAllBidders() {
        return service.getAllBidders();
    }

    @PostMapping("/bids")
    public ResponseEntity<?> placeBid(@RequestBody Map<String, Object> request) {
        try {
            long auctionId = ((Number) request.get("auctionId")).longValue();
            long bidderId = ((Number) request.get("bidderId")).longValue();
            double amount = ((Number) request.get("amount")).doubleValue();
            Bid bid = service.placeBid(auctionId, bidderId, amount);
            return ResponseEntity.ok(bid);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/auctions/{id}/bids")
    public ResponseEntity<?> getBidsForAuction(@PathVariable long id) {
        try {
            return ResponseEntity.ok(service.getBidsForAuction(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/auctions/{id}/close")
    public ResponseEntity<?> closeAuction(@PathVariable long id) {
        try {
            return ResponseEntity.ok(service.closeAuction(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}