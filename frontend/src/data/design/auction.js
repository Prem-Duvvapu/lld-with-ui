// designDetails — auction
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Grounded directly in the real backend: com.lld.auction.service.AuctionService,
// com.lld.auction.observer.*, com.lld.auction.strategy.*, com.lld.auction.exception.*.

export default {
  title: 'Online Auction House — Design Details',
  requirements: [
    'Auction creation — create an auction for an item with a starting bid, a duration, an optional future start delay, and a bid-increment policy (FIXED or PERCENTAGE)',
    'Bidding — registered bidders place bids on an ACTIVE auction; each bid must clear the current bid by the auction\'s configured increment (checked by the active BidIncrementStrategy)',
    'Concurrent bidding safety — two bidders offering the identical amount at the identical instant must never both be recorded as the leading bid; exactly one wins and the other is cleanly rejected',
    'Auto-increment strategies — FixedIncrement (flat currency amount) and PercentageIncrement (percentage of the current bid), swappable per auction without touching AuctionService',
    'Lifecycle guards — a bid before the auction\'s start time, after its end time, or on an already-closed auction is rejected with a typed exception, never silently ignored',
    'Outbid notifications — when a new bid supersedes the previous leading bid, the previous leading bidder is notified via the Observer pattern (in-app feed + server log), independent of the bidding logic',
    'Auction lifecycle — PENDING (not yet open) -> ACTIVE (accepting bids) -> CLOSED (ended by time or by an explicit close); a closed auction never reopens',
    'Isolated demo sandbox — a completely separate repository/notifier pair backs the interactive simulation tab, so demo bids and races can never touch or corrupt live auction data',
  ],
  entities: [
    {
      name: 'AuctionService',
      description: 'Facade the controller delegates to wholesale. Owns the live AuctionRepository plus a fully isolated sim sandbox (repository + notifier + observers), and a per-auction ReentrantLock map guarding every bid.',
      fields: [
        { name: 'repository', type: 'AuctionRepository', description: 'Live in-memory store for auctions, bidders and bids' },
        { name: 'notifier', type: 'AuctionNotifier', description: 'Subject that fans OutbidEvents out to every registered observer' },
        { name: 'strategyFactory', type: 'BidIncrementStrategyFactory', description: 'Resolves a BidIncrementPolicy to its strategy' },
        { name: 'auctionLocks', type: 'ConcurrentHashMap<Long, ReentrantLock>', description: 'One fair lock per auction id, shared by the live and sim paths; never nested' },
        { name: 'simRepository / simNotifier', type: 'AuctionRepository / AuctionNotifier (volatile)', description: 'Isolated sandbox swapped wholesale on every simReset()' },
      ],
      methods: [
        { name: 'createAuction(itemName, description, startingBid, durationMinutes, startDelayMinutes, policy, incrementValue)', returns: 'Auction', description: 'Validates and creates an auction; PENDING if startDelayMinutes > 0, else ACTIVE immediately' },
        { name: 'placeBid(auctionId, bidderId, amount)', returns: 'Bid', description: 'Locks the auction, re-checks the lifecycle window and the current-highest-bid, writes, and — if this supersedes a previous bidder — publishes an OutbidEvent' },
        { name: 'closeAuction(auctionId)', returns: 'Auction', description: 'Locks the auction and transitions it to CLOSED; rejects a double-close' },
        { name: 'simRace(auctionId, bidderCount, step)', returns: 'Map<String,Object>', description: 'Fires bidderCount concurrent identical-amount bids via a CountDownLatch and reports exactly how many succeeded vs. were rejected' },
      ],
    },
    {
      name: 'Auction',
      description: 'An item up for bid. currentBid and highestBidderId are the only fields a bid mutates, and every mutation happens under the per-auction lock — the fix for the check-then-act race.',
      fields: [
        { name: 'id', type: 'long', description: 'Unique auction id' },
        { name: 'itemName / description', type: 'String', description: 'What is being sold' },
        { name: 'startingBid / currentBid', type: 'double', description: 'Opening ask and the current leading bid' },
        { name: 'highestBidderId', type: 'Long', description: 'The current leading bidder, or null before any bid' },
        { name: 'status', type: 'AuctionStatus', description: 'PENDING, ACTIVE, or CLOSED — a cosmetic cache; the real guard re-derives the window from startTime/endTime every bid' },
        { name: 'incrementPolicy / incrementValue', type: 'BidIncrementPolicy / double', description: 'Which BidIncrementStrategy applies, and its parameter (flat amount or percent)' },
        { name: 'startTime / endTime', type: 'long (epoch ms)', description: 'The active bidding window; hasStarted(now)/hasEnded(now) are the source of truth for lifecycle checks' },
      ],
      methods: [
        { name: 'hasStarted(now)', returns: 'boolean', description: 'True once wall-clock time reached startTime, regardless of the cached status field' },
        { name: 'hasEnded(now)', returns: 'boolean', description: 'True once wall-clock time passed endTime, regardless of the cached status field' },
      ],
    },
    { name: 'Bid', description: 'An accepted bid — append-only; a rejected attempt never reaches the repository, so every recorded Bid was, at the moment it was placed, the new leading bid.', fields: [
      { name: 'id / auctionId / bidderId', type: 'long', description: 'Identity and ownership' },
      { name: 'amount', type: 'double', description: 'The accepted bid amount' },
      { name: 'timestamp', type: 'long', description: 'When the bid was accepted' },
    ], methods: [] },
    { name: 'Bidder', description: 'A registered participant. No seller/bidder role split — any bidder can bid on, or be outbid on, any auction.', fields: [
      { name: 'id', type: 'long', description: 'Unique bidder id' },
      { name: 'name / email', type: 'String', description: 'Display identity' },
    ], methods: [] },
    {
      name: 'BidIncrementStrategy',
      description: 'Strategy interface for bid validation / auto-increment. AuctionService calls only this interface — it never branches on BidIncrementPolicy itself.',
      fields: [],
      methods: [
        { name: 'name()', returns: 'String', description: 'Human-readable name for UI/audit display' },
        { name: 'minNextBid(auction)', returns: 'double', description: 'The minimum amount a new bid must reach, computed from the auction\'s current bid — called with the auction\'s lock already held' },
      ],
    },
    { name: 'FixedIncrementStrategy', description: 'minNextBid = currentBid + incrementValue — a flat currency step.', fields: [], methods: [] },
    { name: 'PercentageIncrementStrategy', description: 'minNextBid = currentBid * (1 + incrementValue/100), rounded to 2 decimal places.', fields: [], methods: [] },
    {
      name: 'BidIncrementStrategyFactory',
      description: 'Resolves BidIncrementPolicy to its strategy via an EnumMap built once in the constructor — the same shape as inventory\'s ReorderStrategyFactory and splitwise\'s SplitStrategyFactory. Adding a policy is one enum constant, one class, one map entry.',
      fields: [], methods: [{ name: 'forPolicy(policy)', returns: 'BidIncrementStrategy', description: 'Looks up the strategy; null for an unknown policy' }],
    },
    {
      name: 'AuctionNotifier',
      description: 'Subject of the Observer pattern. Fans every OutbidEvent out to a CopyOnWriteArrayList<AuctionObserver> so publish never locks and subscribe/unsubscribe mid-publish is safe.',
      fields: [], methods: [{ name: 'publish(event)', returns: 'void', description: 'Notifies every observer; a misbehaving observer cannot break the rest' }],
    },
    { name: 'InAppAuctionObserver', description: 'Keeps the last 100 OutbidEvents in memory for GET /api/auction/notifications. A fresh instance backs the sim sandbox so demo notifications never bleed into the live feed.', fields: [], methods: [] },
    { name: 'LoggingAuctionObserver', description: 'Writes every OutbidEvent to the server log — proves two observers with different sinks receive the same event without knowing each other exists.', fields: [], methods: [] },
    {
      name: 'AuctionException hierarchy',
      description: 'AuctionException (abstract) extends com.lld.config.DomainException. Concrete: AuctionNotFoundException (404), BidderNotFoundException (404), AuctionClosedException (409), BidTooLowException (400), InvalidAuctionWindowException (400), InvalidAuctionOperationException (400). Abstract base is excluded from DomainExceptionContractTest\'s scan automatically, same as InventoryException.',
      fields: [], methods: [],
    },
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'AuctionNotifier (subject) fans OutbidEvents out to AuctionObserver implementations — InAppAuctionObserver (queryable feed) and LoggingAuctionObserver (server log) — neither aware the other exists. AuctionService never knows who is watching; it just publishes when a bid supersedes a previous leader.',
    },
    {
      name: 'Strategy + Factory',
      used: true,
      explanation: 'BidIncrementStrategy interface with FixedIncrementStrategy and PercentageIncrementStrategy, resolved by BidIncrementStrategyFactory via an EnumMap. AuctionService calls strategy.minNextBid(auction) without ever branching on the policy — the same shape as inventory\'s ReorderStrategy/ReorderStrategyFactory.',
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'AuctionController does nothing but translate HTTP — every method is a one-line delegation to AuctionService, which owns all validation, locking and orchestration.',
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'AuctionRepository is a plain in-memory store (ConcurrentHashMap + AtomicLong id generators) with no business logic — AuctionService is the only thing that interprets what a stored Auction/Bid/Bidder means.',
    },
    {
      name: 'Sandbox / Isolation',
      used: true,
      explanation: 'The /sim/* engine runs against a second AuctionRepository + AuctionNotifier + observer pair, rebuilt from scratch on every simReset() — the same shape as InventoryService and TrafficSignalService — so the interactive demo can never corrupt live auction state.',
    },
  ],
  principles: [
    { name: 'Single Responsibility (SRP)', description: 'Auction/Bid/Bidder are pure data holders. AuctionService owns orchestration and locking. AuctionNotifier owns fan-out. Each BidIncrementStrategy owns exactly one increment rule.' },
    { name: 'Open/Closed (OCP)', description: 'A new increment policy is one new BidIncrementStrategy implementation plus one factory entry — AuctionService is never touched. A new observer (e.g. an email notifier) is one new AuctionObserver bean — AuctionNotifier and AuctionService are never touched.' },
    { name: 'Liskov Substitution (LSP)', description: 'Any BidIncrementStrategy is interchangeable behind the interface; any AuctionObserver is interchangeable behind AuctionObserver — AuctionService and AuctionNotifier hold only the interface type.' },
    { name: 'Interface Segregation (ISP)', description: 'BidIncrementStrategy exposes exactly the two methods a caller needs (name, minNextBid); AuctionObserver exposes exactly one (onOutbid). Neither forces an implementer to support operations it does not use.' },
    { name: 'Dependency Inversion (DIP)', description: 'AuctionService depends on the BidIncrementStrategy and AuctionObserver abstractions, injected by Spring — never on a concrete FixedIncrementStrategy or InAppAuctionObserver by name.' },
  ],
  oopConcepts: [
    {
      name: 'Encapsulated concurrency — per-auction lock',
      description: 'Every mutation to an Auction\'s currentBid/highestBidderId happens inside doPlaceBid() under that auction\'s own ReentrantLock, with the increment check re-evaluated after acquiring the lock (not before) — the classic check-then-act race fix.',
      alternative: 'A single global lock would serialize unrelated auctions for no reason; per-auction locks (ConcurrentHashMap.computeIfAbsent, never nested) let disjoint auctions bid fully in parallel.',
    },
    {
      name: 'Time-derived state, not cached state',
      description: 'Auction.hasStarted(now)/hasEnded(now) compute the lifecycle window from wall-clock time on every bid. The cached status field is synced lazily for display only — requireBiddable() never trusts it, so a stale status can never let an invalid bid through.',
      alternative: 'Relying only on a background scheduler to flip status would make correctness depend on tick timing; deriving from time directly makes the guard correct even if the scheduler never ran.',
    },
    {
      name: 'Composition over inheritance',
      description: 'Auction has-a BidIncrementPolicy/incrementValue rather than subclassing FixedAuction/PercentageAuction; the behavior difference lives entirely in the injected BidIncrementStrategy.',
      alternative: 'A class-per-policy hierarchy would require a new Auction subtype for every new increment rule; composition needs only a new strategy class.',
    },
  ],
  extensibility: [
    { area: 'New increment policy (e.g. dynamic/velocity-based)', description: 'Add a class implementing BidIncrementStrategy and one entry in BidIncrementStrategyFactory\'s constructor — AuctionService and the exception hierarchy are untouched.', difficulty: 'Easy' },
    { area: 'Proxy / auto-bidding (bid up to a max on the user\'s behalf)', description: 'Add a scheduled evaluator that watches OutbidEvents for a bidder with a registered max and calls placeBid() again on their behalf — reuses the existing Observer wiring.', difficulty: 'Medium' },
    { area: 'Reserve price (auction can end UNSOLD)', description: 'Add a reservePrice field to Auction and a check in the close path; requires a new AuctionStatus value and a status-transition guard.', difficulty: 'Medium' },
    { area: 'Anti-sniping (extend the window on a late bid)', description: 'In doPlaceBid(), if now is within the final N seconds of endTime, push endTime forward — the per-auction lock already serializes this against a concurrent close.', difficulty: 'Easy' },
    { area: 'Email/SMS outbid notifications', description: 'Add a new @Component implementing AuctionObserver; Spring auto-wires it into AuctionNotifier\'s constructor-injected list — zero changes to AuctionService.', difficulty: 'Easy' },
  ],
  tradeoffs: [
    { decision: 'No seller/bidder role split', rationale: 'Matches the original module scope — any registered Bidder can create or bid on any auction. Adding an ownership check (e.g. a seller cannot bid on their own listing) is a small, additive change to doPlaceBid() if a real marketplace needed it.' },
    { decision: 'System clock (System.currentTimeMillis()) rather than an injectable Clock/Ticker', rationale: 'Unlike trafficsignal\'s repeating tick simulation, auction windows are tested by forcing state directly (closeAuction(), or setEndTime() on the stored instance) rather than by advancing a simulated clock — simpler for a module whose correctness hinges on the bid lock, not on tick cadence.' },
    { decision: 'Live and sim bids share one auctionLocks map, keyed by numeric id', rationale: 'Mirrors InventoryService.productLocks exactly. Live and sim repositories both start their own id counters at 1, so a live and a sim entity can in principle share a lock object — harmless in practice (worst case, momentary extra serialization) and kept for consistency with this repo\'s established idiom rather than introducing a second map.' },
  ],
};
