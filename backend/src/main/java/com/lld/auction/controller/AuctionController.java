package com.lld.auction.controller;

import com.lld.auction.model.Auction;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import com.lld.auction.model.SimEvent;
import com.lld.auction.observer.OutbidEvent;
import com.lld.auction.service.AuctionService;
import com.lld.auction.strategy.BidIncrementPolicy;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link AuctionService}. Validation and
 *  every domain rule live in the service, which throws typed {@code AuctionException}s that
 *  {@code GlobalExceptionHandler} turns into the right status code. */
@RestController
@RequestMapping("/api/auction")
@CrossOrigin(origins = "*")
public class AuctionController {

    private final AuctionService service;

    public AuctionController(AuctionService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @PostMapping("/auctions")
    public ResponseEntity<Auction> createAuction(@RequestBody Map<String, Object> request) {
        String itemName = (String) request.get("itemName");
        String description = (String) request.get("description");
        double startingBid = ((Number) request.get("startingBid")).doubleValue();
        long durationMinutes = ((Number) request.get("durationMinutes")).longValue();
        long startDelayMinutes = request.get("startDelayMinutes") == null
                ? 0 : ((Number) request.get("startDelayMinutes")).longValue();
        BidIncrementPolicy incrementPolicy = request.get("incrementPolicy") == null
                ? null : BidIncrementPolicy.valueOf(String.valueOf(request.get("incrementPolicy")).toUpperCase());
        double incrementValue = request.get("incrementValue") == null
                ? 0 : ((Number) request.get("incrementValue")).doubleValue();
        Auction auction = service.createAuction(itemName, description, startingBid,
                durationMinutes, startDelayMinutes, incrementPolicy, incrementValue);
        return ResponseEntity.ok(auction);
    }

    @GetMapping("/auctions")
    public ResponseEntity<List<Auction>> getAllAuctions() {
        return ResponseEntity.ok(service.getAllAuctions());
    }

    @GetMapping("/auctions/{id}")
    public ResponseEntity<Auction> getAuction(@PathVariable long id) {
        return ResponseEntity.ok(service.getAuction(id));
    }

    @PostMapping("/bidders")
    public ResponseEntity<Bidder> registerBidder(@RequestBody Map<String, String> request) {
        Bidder bidder = service.registerBidder(request.get("name"), request.get("email"));
        return ResponseEntity.ok(bidder);
    }

    @GetMapping("/bidders")
    public ResponseEntity<List<Bidder>> getAllBidders() {
        return ResponseEntity.ok(service.getAllBidders());
    }

    @PostMapping("/bids")
    public ResponseEntity<Bid> placeBid(@RequestBody Map<String, Object> request) {
        long auctionId = ((Number) request.get("auctionId")).longValue();
        long bidderId = ((Number) request.get("bidderId")).longValue();
        double amount = ((Number) request.get("amount")).doubleValue();
        return ResponseEntity.ok(service.placeBid(auctionId, bidderId, amount));
    }

    @GetMapping("/auctions/{id}/bids")
    public ResponseEntity<List<Bid>> getBidsForAuction(@PathVariable long id) {
        return ResponseEntity.ok(service.getBidsForAuction(id));
    }

    @PostMapping("/auctions/{id}/close")
    public ResponseEntity<Auction> closeAuction(@PathVariable long id) {
        return ResponseEntity.ok(service.closeAuction(id));
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<OutbidEvent>> getNotifications() {
        return ResponseEntity.ok(service.getNotifications());
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<?> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @GetMapping("/sim/snapshot")
    public ResponseEntity<?> simSnapshot() {
        return ResponseEntity.ok(service.getSimSnapshot());
    }

    @PostMapping("/sim/bid")
    public ResponseEntity<?> simPlaceBid(@RequestBody Map<String, Object> body) {
        long auctionId = ((Number) body.get("auctionId")).longValue();
        long bidderId = ((Number) body.get("bidderId")).longValue();
        double amount = ((Number) body.get("amount")).doubleValue();
        int step = ((Number) body.getOrDefault("step", 0)).intValue();
        return ResponseEntity.ok(service.simPlaceBid(auctionId, bidderId, amount, step));
    }

    @PostMapping("/sim/close")
    public ResponseEntity<?> simClose(@RequestBody Map<String, Object> body) {
        long auctionId = ((Number) body.get("auctionId")).longValue();
        int step = ((Number) body.getOrDefault("step", 0)).intValue();
        return ResponseEntity.ok(service.simClose(auctionId, step));
    }

    @PostMapping("/sim/race")
    public ResponseEntity<?> simRace(@RequestBody Map<String, Object> body) {
        long auctionId = ((Number) body.get("auctionId")).longValue();
        int bidderCount = ((Number) body.getOrDefault("bidderCount", 8)).intValue();
        int step = ((Number) body.getOrDefault("step", 0)).intValue();
        return ResponseEntity.ok(service.simRace(auctionId, bidderCount, step));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }
}
