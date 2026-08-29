// designDetails — stockbroker
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
// Grounded directly in backend/src/main/java/com/lld/stockbroker/** — every class, field and
// method named below exists in the real code, not an invented architecture.

export default {
  title: 'Online Stock Brokerage Platform — Design Details',
  tldr: [
    'In-memory price-time-priority Order Book (dual TreeMap: bids descending, asks ascending) with FIFO queues per price level and immediate partial-fill execution',
    'Strategy Pattern for order execution — MarketExecutionStrategy (walks the book for immediate liquidity) and LimitExecutionStrategy (matches at-or-better than the limit, rests the remainder) — resolved by an EnumMap-based OrderExecutionStrategyFactory',
    'Observer Pattern: Stock is the subject, InAppPriceObserver and LoggingPriceObserver both fan out from the same notifyPriceUpdate() call after a trade settles',
    'Top-of-book self-trade prevention (Cancel-Newest policy): an order that would cross against the placing account\'s own best resting counter-order is rejected with OrderExecutionException before any trade settles',
    'Atomic fund/share pre-reservation under a fair per-Account ReentrantLock, plus a fair per-symbol ReentrantLock serializing order-book matching — the two locks are never held nested, so no lock-ordering deadlock is possible',
  ],
  requirements: [
    'Stock & account management — register tradeable symbols with a live price; open trading accounts with a cash balance and an empty portfolio',
    'Order placement — BUY/SELL, MARKET or LIMIT, with atomic pre-check-and-reserve of funds (BUY) or shares (SELL) before the order is even created',
    'Order matching engine — price-time priority: a marketable order walks the opposite side\'s price levels lowest-ask-first / highest-bid-first, FIFO within a level, executing at the resting (maker) order\'s price',
    'Order lifecycle — PENDING → PARTIALLY_FILLED/EXECUTED, or CANCELLED (releases any unexecuted reservation) / REJECTED (self-trade guard, or a market order that found zero liquidity)',
    'Order cancellation — removes a still-open order from the book and releases whatever portion of its fund/share reservation was never executed',
    'Portfolio tracking — per-symbol Holding with quantity, reservedQuantity, availableQuantity and a running weighted-average buy price updated on every executed buy',
    'Real-time price ticker — every matched trade updates the Stock\'s currentPrice and fans out to both price observers',
    'Self-trade prevention — an account can never be matched against its own resting order at the top of book',
  ],
  entities: [
    {
      name: 'StockBrokerService',
      description: 'Spring-managed facade: stock/account repositories, order books, order matching orchestration and the isolated /sim/* sandbox all live here.',
      fields: [
        { name: 'stocks / accounts / orderBooks / ordersById', type: 'Map<String, ...>', description: 'ConcurrentHashMap-backed in-memory stores, keyed by symbol/accountId/orderId' },
        { name: 'symbolLocks', type: 'Map<String, ReentrantLock>', description: 'One fair lock per symbol, lazily created via computeIfAbsent, serializing that symbol\'s order-book matching' },
        { name: 'strategyFactory', type: 'OrderExecutionStrategyFactory', description: 'Resolves OrderType → OrderExecutionStrategy' },
        { name: 'inAppPriceObserver / loggingPriceObserver', type: 'InAppPriceObserver / LoggingPriceObserver', description: 'Registered on every Stock at registerStock() time' },
      ],
      methods: [
        { name: 'placeOrder(accountId, symbol, side, type, price, quantity)', returns: 'Order', description: 'Reserves funds/shares, creates the order via OrderFactory, then matches it under the symbol lock; releases the reservation and marks REJECTED if the strategy throws OrderExecutionException' },
        { name: 'cancelOrder(orderId)', returns: 'Order', description: 'Removes a still-open order from its OrderBook and releases the unexecuted portion of its reservation, under the same symbol lock' },
        { name: 'registerStock(symbol, name, initialPrice)', returns: 'Stock', description: 'Creates the Stock, registers both price observers, and creates its OrderBook' },
      ],
    },
    {
      name: 'Account',
      description: 'A trading account. cashBalance/reservedBalance are guarded end to end by a fair, per-account ReentrantLock (accountLock) — Lombok @Getter only, never @Data, so the lock field itself can\'t leak into equals/hashCode/toString, and @JsonIgnore keeps it out of API responses.',
      fields: [
        { name: 'accountId / userId', type: 'String', description: 'Identity — accountId is "ACC-" + userId' },
        { name: 'portfolio', type: 'Portfolio', description: 'This account\'s stock holdings' },
        { name: 'cashBalance', type: 'double', description: 'Total cash, mutated only inside accountLock' },
        { name: 'reservedBalance', type: 'double', description: 'Cash pre-committed to open BUY orders' },
        { name: 'accountLock', type: 'ReentrantLock (fair)', description: '@Getter(AccessLevel.NONE) — exposed only via a @JsonIgnore getLock()' },
      ],
      methods: [
        { name: 'reserveFunds(amount)', returns: 'void', description: 'Throws InsufficientFundsException if amount exceeds getAvailableBalance(); otherwise atomically increments reservedBalance' },
        { name: 'releaseReservedFunds(amount)', returns: 'void', description: 'Releases min(amount, reservedBalance) — used on cancel and on order rejection' },
        { name: 'settleBuy(executedCost, reservedCostToRelease)', returns: 'void', description: 'Debits cashBalance and releases the matching reservation, atomically' },
        { name: 'settleSell(proceeds)', returns: 'void', description: 'Credits cashBalance' },
        { name: 'getAvailableBalance()', returns: 'double', description: 'max(0, cashBalance - reservedBalance)' },
      ],
    },
    {
      name: 'Holding',
      description: 'One symbol\'s position within a Portfolio. Every mutator is synchronized on the Holding instance itself — a lock scoped one level finer than Account\'s, so two orders on two different symbols in the same portfolio never contend.',
      fields: [
        { name: 'symbol', type: 'String', description: 'Ticker this holding tracks' },
        { name: 'quantity / reservedQuantity', type: 'int', description: 'Total shares held vs. pre-committed to open SELL orders' },
        { name: 'avgBuyPrice', type: 'double', description: 'Running weighted average, recomputed on every addShares()' },
      ],
      methods: [
        { name: 'reserveShares(qty)', returns: 'void', description: 'Throws InsufficientStockException if qty exceeds getAvailableQuantity()' },
        { name: 'deductShares(qty)', returns: 'void', description: 'Applied on an executed SELL — decrements quantity and releases the matching reservation' },
        { name: 'addShares(qty, executionPrice)', returns: 'void', description: 'Applied on an executed BUY — recomputes avgBuyPrice as a running weighted average' },
      ],
    },
    {
      name: 'Order (abstract) / BuyOrder / SellOrder',
      description: 'BuyOrder and SellOrder are the two concrete subclasses OrderFactory produces. filledQuantity is an AtomicInteger; fill() is synchronized and flips status to PARTIALLY_FILLED or EXECUTED based on how much of totalQuantity has filled.',
      fields: [
        { name: 'orderId / accountId / symbol', type: 'String', description: 'Identity' },
        { name: 'side / type', type: 'OrderSide / OrderType', description: 'BUY|SELL, MARKET|LIMIT' },
        { name: 'limitPrice / totalQuantity', type: 'double / int', description: '0.0 for MARKET orders' },
        { name: 'status', type: 'OrderStatus (volatile)', description: 'PENDING → PARTIALLY_FILLED/EXECUTED, or CANCELLED/REJECTED' },
      ],
      methods: [
        { name: 'fill(qty)', returns: 'void', description: 'synchronized — advances filledQuantity and derives status' },
        { name: 'getRemainingQuantity()', returns: 'int', description: 'max(0, totalQuantity - filledQuantity)' },
      ],
    },
    {
      name: 'OrderBook',
      description: 'Price-time priority ladder for one symbol: bids in a TreeMap sorted descending, asks ascending, each price level a FIFO Queue<Order>. The concurrency-relevant methods are synchronized on the OrderBook instance, but the real serialization for a whole match happens one level up via StockBrokerService\'s per-symbol lock.',
      fields: [
        { name: 'bids', type: 'NavigableMap<Double, Queue<Order>>', description: 'TreeMap(Collections.reverseOrder()) — highest price first' },
        { name: 'asks', type: 'NavigableMap<Double, Queue<Order>>', description: 'TreeMap — lowest price first' },
        { name: 'tradeHistory', type: 'List<Trade>', description: 'CopyOnWriteArrayList, most recent trade first' },
      ],
      methods: [
        { name: 'addRestingOrder(order)', returns: 'void', description: 'Enqueues an unfilled order onto the correct side/price level' },
        { name: 'removeOrder(order)', returns: 'boolean', description: 'Removes an order; drops the whole price level once its queue empties' },
        { name: 'getDepthSnapshot(maxLevels)', returns: 'Map<String,Object>', description: 'Aggregates quantity/orderCount/cumulative per level for the API and the UI depth ladder' },
        { name: 'calculateSpread()', returns: 'double', description: 'best ask − best bid, 0.0 if either side is empty' },
      ],
    },
    {
      name: 'Stock',
      description: 'A tradeable instrument and the Observer-pattern subject. notifyPriceUpdate() is the one place a matched trade fans out to every registered StockPriceObserver.',
      fields: [
        { name: 'symbol / name', type: 'String', description: 'Identity' },
        { name: 'currentPrice', type: 'double (volatile)', description: 'Last executed trade price' },
        { name: 'observers', type: 'List<StockPriceObserver>', description: 'CopyOnWriteArrayList — safe to iterate while another thread registers/removes' },
      ],
      methods: [
        { name: 'notifyPriceUpdate(oldPrice, newPrice, volume)', returns: 'void', description: 'Updates currentPrice, then calls onPriceUpdate() on every observer, swallowing any single observer\'s exception so one bad listener can\'t break the trade' },
      ],
    },
  ],
  designPatterns: [
    { name: 'Strategy Pattern', usage: 'OrderExecutionStrategy interface — MarketExecutionStrategy (immediate depth sweep) and LimitExecutionStrategy (match-then-rest), resolved via OrderExecutionStrategyFactory\'s EnumMap<OrderType, OrderExecutionStrategy> rather than an if/type branch in the service.' },
    { name: 'Factory Method', usage: 'OrderFactory.createOrder(...) validates the request (blank ids, non-positive quantity, non-positive LIMIT price) and returns a concrete BuyOrder or SellOrder — the caller never new()s a subclass directly.' },
    { name: 'Observer Pattern', usage: 'Stock (subject) + StockPriceObserver interface — InAppPriceObserver keeps the last 50 quotes for the UI ticker, LoggingPriceObserver writes a market-ticker log line. Both fire from the same notifyPriceUpdate() call, independently.' },
    { name: 'Facade Pattern', usage: 'StockBrokerService is the single entry point the controller delegates to — it owns repositories, locking discipline and the isolated /sim/* sandbox behind one API.' },
  ],
  principles: [
    { name: 'Single Responsibility (SRP)', description: 'Account owns balance/reservation; Holding owns one symbol\'s position; OrderBook owns the matching ladder; a Strategy owns one order type\'s matching rules. StockBrokerService only orchestrates them.' },
    { name: 'Open/Closed (OCP)', description: 'A new order type (e.g. STOP_LOSS) is one new OrderExecutionStrategy plus one OrderExecutionStrategyFactory.put — StockBrokerService\'s placeOrder() never branches on order type itself.' },
    { name: 'Dependency Inversion (DIP)', description: 'StockBrokerService depends on the OrderExecutionStrategy interface (via the factory) and the StockPriceObserver interface, not on MarketExecutionStrategy/LimitExecutionStrategy or InAppPriceObserver/LoggingPriceObserver concretely.' },
    { name: 'DRY', description: 'Self-trade prevention lives once, as a default method on OrderExecutionStrategy, so both concrete strategies get it for free instead of duplicating the top-of-book check.' },
    { name: 'KISS', description: 'Price-time priority with maker-price execution is the simplest fair matching rule — no auction phases, no dark-pool logic, no order-type-specific matching engines.' },
  ],
  oopConcepts: [
    { name: 'Polymorphism — OrderExecutionStrategy', description: 'MarketExecutionStrategy and LimitExecutionStrategy implement the same execute(order, book, accounts, stock) contract with genuinely different matching rules (a LIMIT order stops walking the book once the price no longer crosses; a MARKET order keeps walking until filled or the book is empty).', alternative: 'A single matching method with an if (type == LIMIT) branch would work but couples both algorithms into one method and makes adding STOP_LOSS a service-level change instead of a new class.' },
    { name: 'Inheritance — Order / BuyOrder / SellOrder', description: 'BuyOrder and SellOrder add no fields of their own — they only fix OrderSide at construction — so all shared state (filledQuantity, status, timestamps) and behaviour (fill()) live once on the abstract Order.', alternative: 'A single Order class with a mutable side field would work too, but the two-subclass split makes OrderFactory\'s branch explicit and gives each side room to diverge later (e.g. a short-sale margin check only SellOrder needs).' },
    { name: 'Encapsulation — Holding/Account reservation', description: 'reservedQuantity/reservedBalance are private and only ever move through reserveShares/reserveFunds/release*/settle* — no caller can set them directly, so the "reserved ≤ total" invariant can\'t be violated from outside.', alternative: 'Exposing plain setters would be simpler but would let a caller reserve past availability by mistake; the current API makes that a compile-time impossibility.' },
  ],
  extensibility: [
    { area: 'New order type (STOP_LOSS, IOC, FOK)', description: 'Implement OrderExecutionStrategy, add one OrderType enum constant, one factory .put() in OrderExecutionStrategyFactory. StockBrokerService and OrderBook need no changes.', difficulty: 'Medium' },
    { area: 'Configurable self-trade prevention policy', description: 'The current guard always rejects (Cancel-Newest). A STP-policy enum (Cancel-Newest / Cancel-Oldest / Decrement-and-Cancel) resolved the same EnumMap way as OrderExecutionStrategyFactory would let each account or order opt into a different policy.', difficulty: 'Medium' },
    { area: 'Persisted order book / trade ledger', description: 'Swap the ConcurrentHashMap-backed repositories for a real datastore behind the same method signatures — StockBrokerService\'s public API doesn\'t change.', difficulty: 'Hard' },
    { area: 'WebSocket price push', description: 'Add a WebSocketPriceObserver implementing StockPriceObserver alongside InAppPriceObserver/LoggingPriceObserver — Stock.notifyPriceUpdate() already fans out to every registered observer.', difficulty: 'Easy' },
  ],
  tradeoffs: [
    'Reservation happens under the Account\'s own lock BEFORE the per-symbol matching lock is acquired, and is always released before the next lock is taken — no two locks are ever held nested, so lock-ordering deadlock is structurally impossible rather than merely avoided by convention.',
    'Self-trade prevention is a top-of-book check only (it does not walk every price level) — a self-order resting deeper in the book is still reachable and will match normally. This mirrors a real exchange\'s inside-market fast path rather than a full order-by-order scan, trading perfect coverage for O(1) overhead on every order.',
    'Maker price priority: a matched trade always executes at the RESTING order\'s price, never the aggressor\'s — this is the same rule most real order-driven exchanges use, and it means a limit order can never get a worse fill than its own limit.',
  ],
  solid: [
    { principle: 'Single Responsibility Principle', details: 'OrderBook handles matching-ladder storage only; Account/Holding handle balance and position reservation; StockBrokerService handles orchestration and locking order.' },
    { principle: 'Open/Closed Principle', details: 'New order types extend via OrderExecutionStrategy + OrderExecutionStrategyFactory without modifying StockBrokerService, OrderBook, or any exception class.' },
  ],
};
