package com.lld.auction.service;

import com.lld.auction.config.AuctionInitializer;
import com.lld.auction.exception.AuctionClosedException;
import com.lld.auction.exception.AuctionException;
import com.lld.auction.exception.AuctionNotFoundException;
import com.lld.auction.exception.BidTooLowException;
import com.lld.auction.exception.BidderNotFoundException;
import com.lld.auction.exception.InvalidAuctionOperationException;
import com.lld.auction.exception.InvalidAuctionWindowException;
import com.lld.auction.model.Auction;
import com.lld.auction.model.AuctionStatus;
import com.lld.auction.model.Bid;
import com.lld.auction.model.Bidder;
import com.lld.auction.model.SimEvent;
import com.lld.auction.observer.AuctionNotifier;
import com.lld.auction.observer.InAppAuctionObserver;
import com.lld.auction.observer.LoggingAuctionObserver;
import com.lld.auction.observer.OutbidEvent;
import com.lld.auction.repository.AuctionRepository;
import com.lld.auction.strategy.BidIncrementPolicy;
import com.lld.auction.strategy.BidIncrementStrategy;
import com.lld.auction.strategy.BidIncrementStrategyFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade the controller delegates to wholesale. Owns the live {@link AuctionRepository} plus a
 * completely separate, isolated sandbox (repository + notifier + observers) for the
 * {@code /sim/*} engine, rebuilt from scratch on every {@link #simReset()} so a demo run can
 * never leak into another and never touches live data — the same shape as
 * {@code InventoryService} and {@code TrafficSignalService}.
 *
 * <h2>Concurrency</h2>
 * A fair {@link ReentrantLock} per auction id (never nested — exactly one auction lock is ever
 * held at a time, so no lock-ordering rule is needed, the same argument as
 * {@code InventoryService}'s per-product locks) guards every bid. The current-highest-bid check
 * and the write that supersedes it happen inside the SAME critical section
 * ({@link #doPlaceBid}), which is what stops two concurrent equal-amount bids from both believing
 * they are leading — the classic check-then-act race. Live and sim bids share one lock map keyed
 * by auction id, mirroring {@code InventoryService.productLocks}.
 */
@Service
public class AuctionService {

    private final AuctionRepository repository;
    private final AuctionNotifier notifier;
    private final InAppAuctionObserver inAppObserver;
    private final BidIncrementStrategyFactory strategyFactory;

    /** Isolated sim sandbox — swapped wholesale on every {@link #simReset()}. Volatile because a
     *  reset can run concurrently with an in-flight sim request reading the old sandbox. */
    private volatile AuctionRepository simRepository;
    private volatile AuctionNotifier simNotifier;
    private volatile InAppAuctionObserver simInAppObserver;
    private final List<SimEvent> simEvents = new java.util.concurrent.CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    /** Per-auction fair locks, shared by the live and sim paths (see class javadoc). */
    private final ConcurrentHashMap<Long, ReentrantLock> auctionLocks = new ConcurrentHashMap<>();

    public AuctionService(AuctionRepository repository,
                           AuctionNotifier notifier,
                           InAppAuctionObserver inAppObserver,
                           BidIncrementStrategyFactory strategyFactory) {
        this.repository = repository;
        this.notifier = notifier;
        this.inAppObserver = inAppObserver;
        this.strategyFactory = strategyFactory;

        AuctionInitializer.seedBidders(repository);
        AuctionInitializer.seedAuctions(repository, now());

        resetSandbox();
    }

    // =========================================================================
    // LIVE API
    // =========================================================================

    public Auction createAuction(String itemName, String description, double startingBid,
                                  long durationMinutes, long startDelayMinutes,
                                  BidIncrementPolicy incrementPolicy, double incrementValue) {
        return doCreateAuction(repository, itemName, description, startingBid,
                durationMinutes, startDelayMinutes, incrementPolicy, incrementValue);
    }

    public Bidder registerBidder(String name, String email) {
        return doRegisterBidder(repository, name, email);
    }

    public Bid placeBid(long auctionId, long bidderId, double amount) {
        return doPlaceBid(repository, notifier, auctionId, bidderId, amount);
    }

    public Auction getAuction(long auctionId) {
        Auction auction = requireAuction(repository, auctionId);
        syncStatus(repository, auction, now());
        return auction;
    }

    public List<Auction> getAllAuctions() {
        long now = now();
        List<Auction> all = repository.getAllAuctions();
        all.forEach(a -> syncStatus(repository, a, now));
        return all;
    }

    public Auction closeAuction(long auctionId) {
        return doCloseAuction(repository, auctionId);
    }

    public List<Bid> getBidsForAuction(long auctionId) {
        requireAuction(repository, auctionId);
        return repository.getBidsForAuction(auctionId);
    }

    public List<Bidder> getAllBidders() {
        return repository.getAllBidders();
    }

    public List<OutbidEvent> getNotifications() {
        return inAppObserver.recentEvents();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        resetSandbox();
        simEvents.clear();
        simEventIdGen.set(1);
        simEvents.add(SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(1).eventType("INITIALIZE").status("SUCCESS")
                .title("Sandbox Reset")
                .description("Sim repository reseeded with 3 bidders (Alice, Bob, Charlie) and 4 auctions: "
                        + "\"Vintage Guitar\" (ACTIVE, fixed +10), \"Antique Pocket Watch\" (ACTIVE, +5%), "
                        + "\"Rare Stamp Collection\" (PENDING, +5%), \"Antique Clock\" (CLOSED).")
                .build());
        return getSimSnapshot();
    }

    public Map<String, Object> getSimSnapshot() {
        long now = now();
        List<Auction> auctions = simRepository.getAllAuctions();
        auctions.forEach(a -> syncStatus(simRepository, a, now));
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("auctions", auctions);
        snapshot.put("bidders", simRepository.getAllBidders());
        snapshot.put("notifications", simInAppObserver.recentEvents());
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    public Map<String, Object> simPlaceBid(long auctionId, long bidderId, double amount, int step) {
        try {
            Bid bid = doPlaceBid(simRepository, simNotifier, auctionId, bidderId, amount);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("BID_PLACED").status("SUCCESS")
                    .title("Bid Accepted")
                    .description("Bidder #" + bidderId + " bid " + amount + " on auction #" + auctionId + ".")
                    .build()
                    .addDetail("bidId", bid.getId()));
        } catch (AuctionException ex) {
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType(ex.getClass().getSimpleName().toUpperCase()).status("ERROR")
                    .title("Bid Rejected")
                    .description(ex.getMessage())
                    .build());
            throw ex;
        }
        return getSimSnapshot();
    }

    public Map<String, Object> simClose(long auctionId, int step) {
        try {
            doCloseAuction(simRepository, auctionId);
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("AUCTION_CLOSED").status("SUCCESS")
                    .title("Auction Closed")
                    .description("Auction #" + auctionId + " closed by seller.")
                    .build());
        } catch (AuctionException ex) {
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType(ex.getClass().getSimpleName().toUpperCase()).status("ERROR")
                    .title("Close Rejected")
                    .description(ex.getMessage())
                    .build());
            throw ex;
        }
        return getSimSnapshot();
    }

    /**
     * Fires {@code bidderCount} concurrent bids of the SAME amount at one auction via a
     * {@link CountDownLatch} so they genuinely race. Exactly one wins — the rest are rejected
     * with {@link BidTooLowException} once the winner's write lands — proving the per-auction
     * lock decides the outcome, not thread scheduling luck. Mirrors
     * {@code InventoryService.simRace}.
     */
    public Map<String, Object> simRace(long auctionId, int bidderCount, int step) {
        if (bidderCount < 2 || bidderCount > 20) {
            throw new InvalidAuctionOperationException("bidderCount must be between 2 and 20");
        }
        Auction auction = requireAuction(simRepository, auctionId);
        BidIncrementStrategy strategy = requireStrategy(auction.getIncrementPolicy());
        double amount = strategy.minNextBid(auction);

        long[] racerIds = new long[bidderCount];
        for (int i = 0; i < bidderCount; i++) {
            Bidder racer = Bidder.builder().id(simRepository.nextBidderId())
                    .name("Racer-" + (i + 1)).email("racer" + (i + 1) + "@sim.local").build();
            simRepository.saveBidder(racer);
            racerIds[i] = racer.getId();
        }

        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(bidderCount);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        Thread[] threads = new Thread[bidderCount];
        for (int i = 0; i < bidderCount; i++) {
            long racerId = racerIds[i];
            threads[i] = new Thread(() -> {
                try {
                    start.await();
                    doPlaceBid(simRepository, simNotifier, auctionId, racerId, amount);
                    succeeded.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (AuctionException e) {
                    rejected.incrementAndGet();
                } finally {
                    done.countDown();
                }
            }, "auction-sim-racer-" + i);
            threads[i].start();
        }
        start.countDown();
        try {
            done.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        Auction after = requireAuction(simRepository, auctionId);
        simEvents.add(SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType("RACE").status("SUCCESS")
                .title("Concurrent Bid Race")
                .description(bidderCount + " bidders raced to offer " + amount + " on auction #" + auctionId
                        + " at the same instant: " + succeeded.get() + " succeeded, " + rejected.get()
                        + " rejected. Winning bidder #" + after.getHighestBidderId() + " at " + after.getCurrentBid() + ".")
                .build()
                .addDetail("succeeded", succeeded.get())
                .addDetail("rejected", rejected.get())
                .addDetail("askAmount", amount));

        Map<String, Object> result = new LinkedHashMap<>(getSimSnapshot());
        Map<String, Object> race = new LinkedHashMap<>();
        race.put("bidderCount", bidderCount);
        race.put("askAmount", amount);
        race.put("succeeded", succeeded.get());
        race.put("rejected", rejected.get());
        race.put("winningBidderId", after.getHighestBidderId());
        race.put("finalBid", after.getCurrentBid());
        result.put("race", race);
        return result;
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    // =========================================================================
    // SHARED INTERNALS — one path for live and sim alike
    // =========================================================================

    private Auction doCreateAuction(AuctionRepository repo, String itemName, String description, double startingBid,
                                     long durationMinutes, long startDelayMinutes,
                                     BidIncrementPolicy incrementPolicy, double incrementValue) {
        if (itemName == null || itemName.isBlank()) {
            throw new InvalidAuctionOperationException("Item name is required");
        }
        if (startingBid <= 0) {
            throw new InvalidAuctionOperationException("Starting bid must be positive");
        }
        if (durationMinutes <= 0) {
            throw new InvalidAuctionWindowException("Duration must be positive");
        }
        if (startDelayMinutes < 0) {
            throw new InvalidAuctionWindowException("Start delay cannot be negative");
        }
        BidIncrementPolicy policy = incrementPolicy == null ? BidIncrementPolicy.FIXED : incrementPolicy;
        requireStrategy(policy); // throws InvalidAuctionOperationException if the policy is somehow unregistered
        double incValue = incrementValue > 0 ? incrementValue
                : (policy == BidIncrementPolicy.PERCENTAGE ? 5.0 : 10.0);

        long now = now();
        long startTime = now + startDelayMinutes * 60_000L;
        long endTime = startTime + durationMinutes * 60_000L;

        Auction auction = Auction.builder()
                .id(repo.nextAuctionId())
                .itemName(itemName)
                .description(description)
                .startingBid(startingBid)
                .currentBid(startingBid)
                .highestBidderId(null)
                .status(startDelayMinutes > 0 ? AuctionStatus.PENDING : AuctionStatus.ACTIVE)
                .incrementPolicy(policy)
                .incrementValue(incValue)
                .createdAt(now)
                .startTime(startTime)
                .endTime(endTime)
                .build();
        repo.saveAuction(auction);
        return auction;
    }

    private Bidder doRegisterBidder(AuctionRepository repo, String name, String email) {
        if (name == null || name.isBlank()) {
            throw new InvalidAuctionOperationException("Name is required");
        }
        if (email == null || email.isBlank()) {
            throw new InvalidAuctionOperationException("Email is required");
        }
        Bidder bidder = Bidder.builder().id(repo.nextBidderId()).name(name).email(email).build();
        repo.saveBidder(bidder);
        return bidder;
    }

    /**
     * The ONE bid-mutation path for live and sim alike. Acquires the per-auction lock, re-checks
     * the lifecycle window and the current-highest-bid INSIDE that lock, and only then writes —
     * so two threads racing to place the same amount can never both observe themselves as
     * leading.
     */
    private Bid doPlaceBid(AuctionRepository repo, AuctionNotifier targetNotifier,
                            long auctionId, long bidderId, double amount) {
        if (amount <= 0) {
            throw new InvalidAuctionOperationException("Bid amount must be positive");
        }
        ReentrantLock lock = lockFor(auctionId);
        lock.lock();
        try {
            Auction auction = requireAuction(repo, auctionId);
            requireBidder(repo, bidderId);
            requireBiddable(auction, now());

            BidIncrementStrategy strategy = requireStrategy(auction.getIncrementPolicy());
            double minNextBid = strategy.minNextBid(auction);
            if (amount < minNextBid) {
                throw new BidTooLowException(auctionId, amount, minNextBid);
            }

            double previousAmount = auction.getCurrentBid();
            Long previousBidderId = auction.getHighestBidderId();

            auction.setCurrentBid(amount);
            auction.setHighestBidderId(bidderId);
            repo.updateAuction(auction);

            Bid bid = Bid.builder()
                    .id(repo.nextBidId())
                    .auctionId(auctionId)
                    .bidderId(bidderId)
                    .amount(amount)
                    .timestamp(now())
                    .build();
            repo.saveBid(bid);

            if (previousBidderId != null && previousBidderId != bidderId) {
                Bidder previousBidder = repo.getBidder(previousBidderId);
                Bidder newBidder = repo.getBidder(bidderId);
                targetNotifier.publish(OutbidEvent.builder()
                        .auctionId(auctionId)
                        .itemName(auction.getItemName())
                        .previousBidderId(previousBidderId)
                        .previousBidderName(previousBidder != null ? previousBidder.getName() : "Bidder #" + previousBidderId)
                        .previousAmount(previousAmount)
                        .newBidderId(bidderId)
                        .newBidderName(newBidder != null ? newBidder.getName() : "Bidder #" + bidderId)
                        .newAmount(amount)
                        .timestamp(now())
                        .message((previousBidder != null ? previousBidder.getName() : "Bidder #" + previousBidderId)
                                + " has been outbid on \"" + auction.getItemName() + "\" — new leading bid "
                                + amount + " by " + (newBidder != null ? newBidder.getName() : "Bidder #" + bidderId))
                        .build());
            }
            return bid;
        } finally {
            lock.unlock();
        }
    }

    private Auction doCloseAuction(AuctionRepository repo, long auctionId) {
        ReentrantLock lock = lockFor(auctionId);
        lock.lock();
        try {
            Auction auction = requireAuction(repo, auctionId);
            if (auction.getStatus() == AuctionStatus.CLOSED) {
                throw new AuctionClosedException("Auction " + auctionId + " is already closed");
            }
            auction.setStatus(AuctionStatus.CLOSED);
            repo.updateAuction(auction);
            return auction;
        } finally {
            lock.unlock();
        }
    }

    /** Rejects a bid outside the auction's active window: not yet started, or already ended/closed. */
    private void requireBiddable(Auction auction, long now) {
        if (auction.getStatus() == AuctionStatus.CLOSED || auction.hasEnded(now)) {
            throw new AuctionClosedException("Auction " + auction.getId() + " (\"" + auction.getItemName()
                    + "\") has already closed — no further bids are accepted");
        }
        if (!auction.hasStarted(now)) {
            throw new InvalidAuctionWindowException("Auction " + auction.getId() + " (\"" + auction.getItemName()
                    + "\") has not started yet — bidding opens at " + auction.getStartTime());
        }
    }

    /** Flips PENDING -> ACTIVE / * -> CLOSED based on wall-clock time, under the auction's own
     *  lock so the write is never torn against a concurrent bid. Purely cosmetic bookkeeping —
     *  {@link #requireBiddable} never trusts this field, it re-derives the window from time
     *  directly, so a late sync can never let an invalid bid through. */
    private void syncStatus(AuctionRepository repo, Auction auction, long now) {
        if (auction.getStatus() == AuctionStatus.CLOSED) {
            return;
        }
        boolean shouldClose = auction.hasEnded(now);
        boolean shouldActivate = auction.getStatus() == AuctionStatus.PENDING && auction.hasStarted(now);
        if (!shouldClose && !shouldActivate) {
            return;
        }
        ReentrantLock lock = lockFor(auction.getId());
        lock.lock();
        try {
            if (auction.getStatus() == AuctionStatus.CLOSED) {
                return;
            }
            if (auction.hasEnded(now)) {
                auction.setStatus(AuctionStatus.CLOSED);
            } else if (auction.getStatus() == AuctionStatus.PENDING && auction.hasStarted(now)) {
                auction.setStatus(AuctionStatus.ACTIVE);
            }
            repo.updateAuction(auction);
        } finally {
            lock.unlock();
        }
    }

    private Auction requireAuction(AuctionRepository repo, long auctionId) {
        Auction auction = repo.getAuction(auctionId);
        if (auction == null) {
            throw new AuctionNotFoundException(auctionId);
        }
        return auction;
    }

    private Bidder requireBidder(AuctionRepository repo, long bidderId) {
        Bidder bidder = repo.getBidder(bidderId);
        if (bidder == null) {
            throw new BidderNotFoundException(bidderId);
        }
        return bidder;
    }

    private BidIncrementStrategy requireStrategy(BidIncrementPolicy policy) {
        BidIncrementStrategy strategy = strategyFactory.forPolicy(policy);
        if (strategy == null) {
            throw new InvalidAuctionOperationException("Unknown increment policy: " + policy);
        }
        return strategy;
    }

    private ReentrantLock lockFor(long auctionId) {
        return auctionLocks.computeIfAbsent(auctionId, id -> new ReentrantLock(true));
    }

    private long now() {
        return System.currentTimeMillis();
    }

    private void resetSandbox() {
        AuctionRepository freshRepo = new AuctionRepository();
        AuctionInitializer.seedBidders(freshRepo);
        AuctionInitializer.seedAuctions(freshRepo, now());
        InAppAuctionObserver freshFeed = new InAppAuctionObserver();
        AuctionNotifier freshNotifier = new AuctionNotifier(List.of(freshFeed, new LoggingAuctionObserver()));
        this.simRepository = freshRepo;
        this.simInAppObserver = freshFeed;
        this.simNotifier = freshNotifier;
    }
}
