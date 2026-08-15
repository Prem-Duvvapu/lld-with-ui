# Walkthrough — LLD Case Studies Phase Completion

Completed end-to-end implementation and verification for core LLD modules and parity upgrades:
1. **ATM System LLD (#7 Parity Upgrade)**
2. **Pub/Sub System LLD (#27)**
3. **Online Shopping System (Shopping Cart LLD #19)**
4. **LinkedIn Professional Network LLD (#25)**
5. **Library Management System LLD (#10)**
6. **Airline Reservation System LLD (#13)**
7. **Online Stock Brokerage Platform LLD (#35)**
8. **Vending Machine LLD (#21 Major Upgrade)**
9. **App Routing & Dynamic Navigation Integrations**

---

## 1. ATM System LLD (Project #7)

### Key Architecture (`com.lld.atm`)
- **Hardware Session State Machine**: `IDLE` ➔ `CARD_INSERTED` ➔ `AUTHENTICATED` ➔ `TRANSACTION_IN_PROGRESS` ➔ `DISPENSING` ➔ `CARD_BLOCKED`.
- **Denomination Strategy**: `GreedyDenominationDispenseStrategy` greedily calculating ₹2000, ₹500, ₹200, and ₹100 notes.
- **Fine-Grained Concurrency & Compensating Transactions**: Per-account `ReentrantLock` preventing balance races with compensating transaction refund rollback if cash dispenser runs out of physical notes.
- **Card Security Lockout**: 3-attempt PIN lockout blocking the physical card.
- **4-Tab React UI (`src/lld/atm/`)**: ATM Terminal Keypad, Concurrency Simulation, Class Diagram, Design Details.

---

## 2. Pub/Sub System LLD (Project #27)

### Key Architecture (`com.lld.pubsub`)
- Dedicated per-subscriber worker thread running an `ArrayBlockingQueue<Message>` to guarantee **strict FIFO message delivery ordering per subscriber**.
- `CopyOnWriteArrayList<SubscriberWorker>` dispatches messages without locking subscribers during high-throughput publish iterations.
- Drop-and-reject backpressure policy emits `QueueFullException` simulation alerts without stalling publishers when a slow consumer's queue overflows.
- **5-Tab React UI (`src/lld/pubsub/`)**: Topics & Publishers, Subscribers & Inboxes, Interactive 2D Simulation, Class Diagram, Design Details.

---

## 3. Online Shopping System (Project #19)

### Key Architecture (`com.lld.shoppingcart`)
- **Command Pattern**: `CartCommand` interface (`AddItemCommand`, `RemoveItemCommand`, `UpdateQuantityCommand`) supporting single-step atomic Undo functionality.
- **Strategy Pattern**: `PaymentStrategy` interface with `CreditCard`, `DebitCard`, `UPI`, and `Wallet` strategies.
- **Deadlock Prevention**: Ascending `productId` lock acquisition ordering on per-product `ReentrantLock` instances during checkout.
- **7-Tab React UI (`src/lld/shoppingcart/`)**: Shop Catalog, Cart & Checkout with Undo, Orders Timeline, Seller Dashboard, Interactive 2D Concurrency Simulation, Class Diagram, Design Details.

---

## 4. LinkedIn Professional Network LLD (Project #25)

### Key Architecture (`com.lld.linkedin`)
- **Graph Safety & Canonical Pair Locking**: `ConcurrentHashMap` repository + canonical pair locking (`min(u1, u2) + "#" + max(u1, u2)`) eliminating connection request race conditions.
- **Strategy Pattern for Weighted Ranking**: `UserSearchRankingStrategy` (weighted 4-factor scoring: name, headline, skills, network degree) and `JobSearchRankingStrategy` (title, skill overlap, location, recency).
- **Observer Pattern**: `NotificationObserver` pipeline (`InAppNotificationObserver`, `LoggingNotificationObserver`) for connection requests, messages, and job applications.
- **Direct Messaging Guard**: Enforces 1st-degree `ACCEPTED` connection status prior to transmission.
- **6-Tab React UI (`src/lld/linkedin/`)**: My Profile & Network, Jobs & Applications, Messaging & Inboxes, 2D Sandbox Simulation, Class Diagram, Design Details.

---

## 5. Library Management System LLD (Project #10)

### Key Architecture (`com.lld.library`)
- **Factory Pattern (`MemberFactory`)**: Instantiates typed members bound to specific `LoanPolicy` limits (`STUDENT` = 3 books / 14 days; `FACULTY` = 10 books / 30 days; `GENERAL` = 5 books / 21 days).
- **Fine-Grained Concurrency & Double-Borrow Guards**: Dual locking — per-book `ReentrantLock` preventing last-copy race conditions and per-member mutex guarding borrow limit oversubscription.
- **Strategy Pattern (`FineStrategy`)**: `StandardFineStrategy` calculating daily overdue late fees upon book returns.
- **Observer Pattern (`DueDateNotifier`)**: Emits reminder notifications (2 days before due date) and overdue transition alerts via `@Scheduled` background sweeps.
- **6-Tab React UI (`src/lld/library/`)**: Book Catalog & Borrow, Member Dashboard & Active Loans, Notifications & Alerts, Concurrency & Loan Simulation, Class Diagram, Design Details.

---

## 6. Airline Reservation System LLD (Project #13)

### Key Architecture (`com.lld.airline`)
- **Multi-Passenger Atomic Booking**: Pairs `List<Passenger>` and `List<String> seatNumbers` in a single transactional booking.
- **Deadlock-Free Concurrency (`SeatLockManager`)**: Fine-grained per-seat `ReentrantLock` keyed `flightId:seatNumber` acquired in ascending alphabetical order.
- **Hold State Machine & TTL**: `AVAILABLE` ➔ `HELD` (5-minute TTL) ➔ `BOOKED` with automated background cleanup of stale holds.
- **Strategy Pattern for Pricing & Refunds**: `ClassBasedPricingStrategy` (Economy, Premium Economy, Business, First) and `TieredCancellationRefundPolicy` (>24h full refund, 24h–2h partial 50%, <2h no refund).
- **5-Tab React UI (`src/lld/airline/`)**: Flight Search & Seat Map, My Bookings & Refunds, Concurrency Simulation, Class Diagram, Design Details.

---

## 7. Online Stock Brokerage Platform LLD (Project #35)

### Key Architecture (`com.lld.stockbroker`)
- **In-Memory Limit Order Book**: Price-Time Priority matching engine with dual `TreeMap` price levels (`bids` descending, `asks` ascending) and FIFO queues.
- **Strategy Pattern for Order Execution**: `MarketExecutionStrategy` (immediate depth sweep) and `LimitExecutionStrategy` (immediate match + resting remainder).
- **Atomic Pre-Trade Balance Reservation**: Mutex-guarded cash reservation for Buy orders and share reservation for Sell orders, preventing over-commitment and race conditions.
- **Observer Pattern for Live Quotes**: Registered `StockPriceObserver` instances receive push updates on last-traded price and executed volume.
- **Per-Symbol Concurrency Serialization**: Dedicated per-symbol `ReentrantLock` ensuring atomic matching while allowing independent stock tickers to trade in parallel.
- **5-Tab React UI (`src/lld/stock-brokerage/`)**: Trade & Portfolio, Live Order Book & Depth Ladder, Concurrency & Matching Simulation, Class Diagram, Design Details.

---

## 8. Vending Machine LLD (Project #21 Major Upgrade)

### Key Architecture (`com.lld.vendingmachine`)
- **State Pattern**: `VendingMachineState` interface with concrete states (`IdleState`, `HasSelectionState`, `HasMoneyState`, `DispensingState`) enforcing safe, type-level lifecycle transitions without nested if/else statements.
- **Chain of Responsibility (CoR)**: `ChangeDispenserChain` pipeline managing descending denomination handlers (`₹500` → `₹100` → `₹50` → `₹20` → `₹10` → `₹5` → `₹2` → `₹1`) with coin/note hopper capacity bounds.
- **Dual Workflow Flexibility**: Supports customer choosing slot first then paying, or inserting cash first then selecting product.
- **Thread Safety**: `ReentrantLock` guarding atomic coil motor activations, stock decrements, and cashbox balance updates.
- **Isolated Simulation Sandbox**: `/api/vendingmachine/sim/*` endpoints supporting an 8-step interactive educational walkthrough with live telemetry events.
- **5-Tab React UI (`src/lld/vendingmachine/`)**: 3x4 Matrix Showcase with Spiral Coils, Alphanumeric Keypad, Coin/Banknote Acceptor, Admin Restock Drawer, 8-Step 2D Simulation, Class Diagram, Design Details.

---

## 9. Coffee Machine LLD (Project #14)

### Key Architecture (`com.lld.coffeemachine`)
- **Decorator Pattern for Drink Customization**: `CoffeeComponent` contract with `BaseCoffee` and concrete decorators (`ExtraShotDecorator`, `ExtraMilkDecorator`, `WhippedCreamDecorator`, `CaramelSyrupDecorator`, `OatMilkDecorator`), dynamically assembling cumulative prices and combining multi-ingredient requirements.
- **Factory Pattern for Recipe Registry**: `CoffeeFactory` encapsulates recipe lookups (`Espresso`, `Latte`, `Cappuccino`, `Americano`, `Mocha`) and supports runtime registration of new artisan formulas.
- **Hardware Session State Machine**: `IDLE` ➔ `SELECTING` ➔ `PAYMENT_PENDING` ➔ `BREWING` ➔ `DISPENSED` ➔ `IDLE`, enforcing transition guards without tangled condition blocks.
- **Deadlock-Free Multi-Ingredient Locking**: `IngredientStore` sorts all required `IngredientType` enums in deterministic ascending ordinal order before sequential `ReentrantLock` acquisition, eliminating circular wait during overlapping multi-ingredient demand.
- **Single Physical Brew Head Mutex**: Dedicated `brewHeadLock` guaranteeing that only one cup extracts on the physical dispenser nozzle at any time.
- **Isolated Simulation Engine**: `/api/coffeemachine/sim/*` endpoints powering an 8-step educational walkthrough and concurrent race simulation with real-time telemetry events.
- **5-Tab React UI (`src/lld/coffeemachine/`)**: Interactive Barista Console with Dynamic Cup Visualizer, Ingredient Hoppers & Refill Dashboard, Concurrency Simulation, Class Diagram, Design Details.

---

## 10. Verification Results

### Automated Backend Tests
- Executed full repository backend unit test suite:
  ```bash
  wsl bash -c "cd backend && mvn test"
  ```
- **Results**: **123 tests run, 0 failures, 0 errors** (`BUILD SUCCESS`).
  - `CoffeeMachineServiceTest`: 10/10 passed
  - `VendingMachineServiceTest`: 12/12 passed
  - `StockBrokerServiceTest`: 8/8 passed
  - `AirlineServiceTest`: 7/7 passed
  - `LibraryServiceTest`: 7/7 passed
  - `LinkedInServiceTest`: 7/7 passed
  - `AtmServiceTest`: 5/5 passed
  - `ShoppingCartServiceTest`: 5/5 passed
  - `PubSubServiceTest`: 5/5 passed
  - `ParkingLotServiceTest`: 18/18 passed
  - `MovieTicketServiceTest`: 7/7 passed
  - `SplitwiseServiceTest`: 7/7 passed
  - `ElevatorConcurrencyTest` / `LookScanDispatchStrategyTest`: 6/6 passed
  - `TicTacToeServiceTest`: 5/5 passed
  - `LruCacheServiceTest`: 5/5 passed
  - `ZomatoServiceTest`: 3/3 passed

### Automated Frontend Production Build
- Executed Vite production bundle compilation:
  ```bash
  wsl bash -c "cd frontend && npx vite build"
  ```
- **Result**: **153 modules transformed cleanly in 8.16s with 0 build errors**.

---

## 11. Git Repository Sync

All updates, implementations, and documentation are committed and pushed to `main`.
