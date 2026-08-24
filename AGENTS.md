# LLD-with-UI — Context

## Architecture
- **Backend**: Java 17 + Spring Boot 3.2 (port 9090). Single JAR, all modules under `com.lld.*`
- **Swagger / OpenAPI**: SpringDoc UI at `http://localhost:9090/swagger-ui.html` and JSON at `/v3/api-docs`
- **Frontend**: React 19 + Vite + React Router 7. Single SPA, dynamically loads LLD pages
- **Data**: In-memory only (no DB). State resets on restart.

## Patterns
- Backend owns ALL business logic. Frontend is a thin API-calling shell.
- All modules use in-memory `ConcurrentHashMap` + `ReentrantLock` for thread safety.
- CORS: `@CrossOrigin(origins = "*")` on every controller.
- **Error contract (all modules)**: a module's base exception extends `com.lld.config.DomainException`; each concrete exception carries `@ResponseStatus(...)`. `GlobalExceptionHandler` (`@RestControllerAdvice`) resolves the status from that annotation and returns a `com.lld.config.ErrorResponse` record (`error`, `code`, `status`, `timestamp`). Never build an error body with `Map.of("error", e.getMessage())` — `Map.of` rejects nulls and `getMessage()` is null for NPEs; use `ErrorResponse.of(e)` or `ErrorResponse.messageOf(e)`. Domain exceptions must never map to a 5xx.
- **Design data**: one file per module — `frontend/src/data/design/{module}.js` and `frontend/src/data/diagrams/{module}.js` — registered in the `designDetails.js` / `classDiagrams.js` barrel. Never add a second key for the same module; the single shared object literal previously let JavaScript discard the richer duplicate at parse time (see RCA-002).
- **Module key lookup**: `frontend/src/data/moduleKeys.js` is the only resolver (`resolveModuleData`). Add new spellings to its `ALIAS_MAP` rather than to a component.
- **Design components take a `module` prop** — not `lldKey`, not `moduleKey`. `LldPage` renders the `design` / `diagram` tabs itself and suppresses `children` for them, so a page must not also render `<ClassDiagram>` for those tabs.
- **Route pages lazily.** `App.jsx` globs `./lld/**/*Page.jsx` without `eager` and wraps each in `React.lazy` inside a `<Suspense>`; every page is its own chunk. Register a `path="*"` fallback so a bad URL is visible, not blank.
- Frontend: one folder per LLD in `src/lld/`, each with `{Name}Page.jsx` + `api.js`.
- **Terminal Execution**: ALWAYS use WSL (`wsl <command>`) for running commands.
- **Server Execution**: NEVER start backend or frontend automatically — the user starts/stops servers manually.
- **Incident Tracking & Post-Resolution RCAs**: Maintain `RCA.md` in the root directory. Whenever an important/non-trivial issue is diagnosed and resolved (such as port collisions, concurrency races, build failures, serialization bugs, or environment discrepancies), ALWAYS add a structured Root Cause Analysis entry to `RCA.md` immediately after resolving it. Document: (1) Overview & Severity, (2) Symptoms & Error Logs, (3) Root Cause, (4) Diagnostic Commands, (5) Step-by-Step Resolution, and (6) Preventative Measures.

## Git Workflow (required for every change)

**Never commit to `main` directly.** Every change — a feature, a fix, a doc edit — follows the
same loop:

1. **Branch off `main`.** `git checkout main && git pull && git checkout -b <type>/<short-slug>`
   (e.g. `feat/uber-sim-engine`, `fix/chess-castling`). One branch per logical unit of work.
2. **Commit** with conventional-commit messages, one commit per module or per concern.
3. **Push and open a pull request** against `main`:
   `gh pr create --base main --fill`
4. **CI must pass before merge.** `.github/workflows/ci.yml` runs both suites, `mvn package`,
   `vite build`, and the entry-chunk size budget on every push and PR. A red build never merges.
5. **Merge only once every check is green**, then delete the branch.

`main` should be protected so this is enforced rather than remembered — the required status
checks are `Backend — mvn test` and `Frontend — vitest + build` (names must match the `name:`
values in `ci.yml` exactly).

Before opening the PR, run the suites locally so CI is a confirmation, not a discovery:

```bash
cd backend  && mvn test        # currently 203 tests
cd frontend && npx vitest run  # currently 250 tests
cd frontend && npm run build   # entry chunk must stay under 500 kB
```

## Parking Lot Module
### Backend
- `ParkingLotInitializer`: 3 floors, 10 spots each (4 CAR + 4 BIKE + 2 TRUCK). Gates: G1/G2=ENTRY, G3/G4=EXIT.
- `ParkingLotService`: entry( gateId, vehicleNumber, vehicleType ) → creates ticket + assigns spot; exit( gateId, ticketNumber ) → calculates amount, releases spot.
- Pricing: CAR=₹20/hr, BIKE=₹10/hr, TRUCK=₹40/hr. Min 1hr charge.

#### Theme
- Light/dark themes via CSS custom properties (`data-theme` attribute on `<html>`).
- `ThemeContext` + `ThemeToggle` in every page top-right corner. Default: light.
- Theme persisted in localStorage under `lld-theme`.

### Frontend
- 7 tabs: Entry, Exit, Spots, Tickets, Animated Demo, Class Diagram, Design Details.
- AnimatedDemo flow: Start → Entry → Ticket → Park → Away(simulated activity) → Return → Exit → Done.
- SpotGrid polls `/floors` every 5s. ActiveTickets polls `/tickets/active` every 5s.
- `DesignDetails` component renders requirements, entities, design patterns, SOLID, OOP concepts, extensibility.
- All pages use CSS variables (`var(--bg-primary)`, `var(--text-primary)`, etc.) from `src/styles/theme.css`.

### Files
- `src/styles/theme.css` — CSS variables for light + dark themes, global resets.
- `src/context/ThemeContext.jsx` — React context for theme state + toggle.
- `src/components/ThemeToggle.jsx` — Sun/moon toggle button.
- `src/components/DesignDetails.jsx` — Renders detailed design breakdown from data.
- `src/data/designDetails.js` — Barrel index; content lives in `src/data/design/{module}.js`.
- `src/data/classDiagrams.js` — Barrel index; content lives in `src/data/diagrams/{module}.js`.
- `src/data/moduleKeys.js` — The only module-id → data-key resolver, shared by both components.

## Uber Module
### Backend
- `UberInitializer`: Sample riders & drivers (UBER_GO, UBER_XL, UBER_PREMIUM).
- `UberService`: Facade over estimate, requestRide, acceptRide, declineRide, verifyOtpAndStart, arriveAtDestination, completeTrip, cancelTrip. Every status change goes through one private `transition(ride, next)` gate instead of each method carrying its own list of acceptable source states.
- `RideStatus`: REQUESTED, ACCEPTED, ONGOING, DESTINATION_REACHED, PAYMENT_PENDING, COMPLETED, PAYMENT_FAILED, CANCELLED — with the legal transitions declared in one `Map<RideStatus, Set<RideStatus>>` and exposed via `canTransitionTo`, `allowedNext` and `isTerminal`. COMPLETED and CANCELLED are terminal; PAYMENT_FAILED is retryable.
- `VehicleType`: Per-km rate and seat count live on the enum (`UBER_GO` ₹12/km, `UBER_XL` ₹18/km, `UBER_PREMIUM` ₹25/km), so adding a class is one edit rather than a new arm in every pricing `switch`.
- Strategy Pattern: `FarePricingStrategy` with `StandardFarePricingStrategy` (₹25 base + distance × rate) and `SurgeFarePricingStrategy` (1.8x default, clamped to 1.0–5.0), resolved by `FarePricingStrategyFactory.forDemand(surgeActive)`. `FareEstimate` carries the strategy name so the UI can show which pricing applied.
- `DriverAssignmentService`: Per-driver `ReentrantLock` (fair) serialising assignment, with availability **re-read and re-checked inside the lock**. This closes a check-then-act race where two riders could both pass `isAvailable()` before either wrote, and both rides ended up ACCEPTED with the same driver. Only one lock is ever held at a time, so no ordering rule is needed; `release()` returns the driver to the pool under the same lock.
- Exception hierarchy: `UberException extends com.lld.config.DomainException` with `RideNotFoundException` (404), `DriverNotFoundException` (404), `RiderNotFoundException` (404), `DriverUnavailableException` (409), `InvalidRideTransitionException` (400), `OtpVerificationException` (400), `RidePaymentFailedException` (422).
- `PaymentProcessor`: Validates and completes rider payments (`UPI`, `CARD`, `CASH`).
- Tests: `UberServiceTest` (workflow + every rejection), `FarePricingStrategyTest` (fare arithmetic, rounding, surge bounds, factory), `UberRepositoryTest` (storage, filtering, atomic ride-id generation), `RideStatusTest` (transition table), `UberConcurrencyTest` (riders racing for one driver, drivers racing for one ride, disjoint pairs, reclaim after release).

### Frontend
- 6 tabs: Passenger Booking, Driver Dashboard, Trip History, Interactive 2D Simulation, Class Diagram, Design Details.
- Real-time polling & interactive 2D city map scene (asphalt road, skyline, street lamps, car headlight beam).

## Zomato Module
### Backend
- `ZomatoInitializer`: Sample customers, restaurants with categorized menus, and delivery partners.
- `ZomatoService`: placeOrder, confirmOrder, startPreparingOrder, markReadyForPickup, verifyOtpAndDeliver, cancelOrder, toggleMenuAvailability, toggleAgentAvailability.
- `OrderStatus`: PLACED, CONFIRMED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED.
- `PaymentProcessor`: Processes payments (`UPI`, `CREDIT_CARD`, `DEBIT_CARD`, `WALLET`, `CASH_ON_DELIVERY`) and handles cancellation refunds.

### Frontend
- 6 tabs: 🍕 Food Ordering, 🏪 Restaurant Dashboard, 🛵 Delivery Partner, Interactive 2D Simulation, Class Diagram, Design Details.
- Real-time polling, 8-step Interactive 2D Simulation scene (night city map, kitchen smoke particles, moving scooter, customer house, live HUD), and color-accented section borders.

## Tic Tac Toe Module
### Backend
- `TicTacToeService`: createGame, makeMove, undoLastMove, resetGame.
- `GameMode`: HUMAN_VS_HUMAN, HUMAN_VS_AI.
- `AIDifficulty`: EASY, MEDIUM, UNBEATABLE (Minimax Algorithm).
- `AIMoveStrategy`: Strategy pattern for AI move calculation (`RandomAIMoveStrategy`, `MinimaxAIMoveStrategy`).
- Thread safety: `ConcurrentHashMap` repository + per-game `ReentrantLock`.

### Frontend
- 6 tabs: 🎮 Game Board, 🤖 AI Arena, 📜 Move History & Replay, 🕹️ Interactive 2D Simulation, Class Diagram, Design Details.
- Routes: `/tic-tac-toe` and `/tictactoe`.
- 8-step Interactive 2D Simulation scene (neon grid, AI brain pulse, laser winning line, live telemetry HUD).

## Splitwise Module
### Backend
- `SplitwiseInitializer`: Sample users (Alice, Bob, Charlie, Diana), groups ("Trip to Goa", "Flatmates"), and initial expenses.
- `SplitwiseService`: createUser, createGroup, addExpense, settleUp, getSimplifiedDebts, getEventLog, and isolated sim methods (`simCreateUser`, `simCreateGroup`, `simAddExpense`, `simSettleUp`, `simGetSimplifiedDebts`).
- Strategy Pattern: `SplitStrategy` interface with `EqualSplitStrategy`, `PercentageSplitStrategy`, `ExactSplitStrategy`, resolved via `SplitStrategyFactory`.
- Debt Simplification: Greedy Min-Cash-Flow graph algorithm reducing settlement transactions.
- Audit Event Logging: Type-safe `ExpenseEventType` enum (`USER_CREATED`, `GROUP_CREATED`, `MEMBER_ADDED`, `EXPENSE_ADDED`, `SETTLEMENT`) with IST (`Asia/Kolkata`) timestamps and balance snapshots.
- Models: Clean Lombok `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` entity models.
- Thread Safety: `ConcurrentHashMap` repository + `ReentrantLock` for atomic balance ledger mutations.

### Frontend
- 6 tabs: 💰 Expense Manager, 📊 Balance Dashboard, 📜 Activity Feed, 🕹️ Interactive 2D Simulation, Class Diagram, Design Details.
- 1-click debt settlements in Balance Dashboard and custom settlement form in Expense Manager with instant ledger refresh.
- 8-step Interactive 2D Simulation scene calling isolated `/api/splitwise/sim/*` endpoints with live balance HUD and debt graph topology.

## Movie Ticket Booking Module (BookMyShow)
### Backend
- `MovieTicketInitializer`: Sample movies (Inception, The Dark Knight, Interstellar), theaters (PVR Superplex, Cinepolis), screens, shows, seats, and users.
- `MovieTicketService`: getMovies, getShows, getSeats, holdSeats, bookSeats, cancelBooking, getUserBookings, and isolated sim methods (`simReset`, `simGetSeats`, `simGetEvents`, `simHoldSeats`, `simBookSeats`, `simExpireHold`, `simCancelBooking`).
- Concurrency & Double-Booking Prevention: `SeatLockManager` using per-seat `ReentrantLock` (`showId:seatId`), deadlock prevention via ascending seat ID acquisition, and 5-minute hold TTL.
- Strategy & Observer Patterns: `PricingStrategy` (`BasePricingStrategy`, `SurgePricingStrategy`), `SeatMapNotifier` publishing status updates to `SeatAvailabilityObserver`.
- Custom Exceptions: `SeatNotAvailableException` (409), `HoldExpiredException` (410), `BookingFailedException` (422), `CancellationFailedException` (400), `InvalidShowException` (404).

### Frontend
- 5 tabs: 🎬 Movies & Booking, 📊 Booking History, 🕹️ Concurrency Simulation, 📐 Class Diagram, 📋 Design Details.
- Real-time seat map polling every 3s, hold countdown timer (`⏱ 4:58`), payment method selector, idempotency key support, and 8-step interactive 2D simulation scene calling isolated `/api/movie-ticket/sim/*` endpoints.

## Elevator System Module
### Backend
- `ElevatorControllerService`: Manages 4 elevators across 10 floors with atomic LOOK/SCAN dispatch scoring, fallback queueing, and state machine (`IDLE`, `MOVING_UP`, `MOVING_DOWN`, `DOOR_OPEN`, `MAINTENANCE`).
- `LookScanDispatchStrategy`: Distance + direction penalty scoring with 3-tier tie-breaking.
- `Elevator`: Thread-safe per-elevator state, `AtomicInteger` occupancy limit, dual `ConcurrentSkipListSet`s (`upStops`, `downStops`), and `ReentrantLock`.
- `ElevatorNotifier`: Observer pattern broadcasting telemetry events to observers.

### Frontend
- 5 tabs: Live Elevator Shafts, Controller Dashboard, 8-step Interactive Simulation, Class Diagram, Design Details.
- Real-time shaft visualizer with animated sliding doors, occupancy gauges, floor call buttons, and interactive simulation replay.

## Shopping Cart Module
### Backend
- `ShoppingCartInitializer`: Seed products across categories (Electronics, Fashion, Home, Books) and sample users.
- `ShoppingCartService`: Catalog search, Command Pattern execution stack for cart actions (`AddItemCommand`, `RemoveItemCommand`, `UpdateQuantityCommand`), deadlock-free ascending `productId` lock ordering during checkout, atomic stock check-and-decrement, idempotency cache, guarded order lifecycle state transitions, and isolated `/sim/*` engine.
- Strategy Pattern: `PaymentStrategy` interface with `CreditCardPaymentStrategy`, `DebitCardPaymentStrategy`, `UpiPaymentStrategy`, and `WalletPaymentStrategy`, routed via `ShoppingCartPaymentProcessor`.

### Frontend
- 7 tabs: Shop Catalog, Cart & Checkout with Undo, Orders Timeline, Seller Dashboard, Interactive 2D Concurrency Simulation, Class Diagram, Design Details.
- Real-time stock alerts, single-step Undo cart button, multi-method payment selector, and low-stock race condition interactive timeline visualizer.

## Pub Sub System Module
### Backend
- `PubSubService`: Singleton Spring service facade managing high-throughput `Broker` and topics.
- `Topic`: Manages active subscribers via `CopyOnWriteArrayList<SubscriberWorker>` for lock-free publish iteration.
- `SubscriberWorker`: Dedicated per-subscriber thread draining a bounded `ArrayBlockingQueue<Message>` sequentially to guarantee strict FIFO delivery order per subscriber.
- Backpressure Policy: Drop-and-reject policy when a subscriber queue is full, emitting simulation alerts without stalling publishers.

### Frontend
- 5 tabs: Topics & Publishers, Subscribers & Inboxes, Interactive 2D Simulation, Class Diagram, Design Details.
- Real-time message flow visualizer with publisher nodes, broker hub, animated particle streams, queue depth fill bars, and slow-subscriber backpressure indicators.

## ATM Module
### Backend
- `AtmInitializer`: Seed sample accounts, card credentials ( John Doe = 1234, Jane Smith = 4321, Alice Johnson = 0000 ), and initial cash dispenser note inventory.
- `AtmService`: Singleton facade managing session state machine (`IDLE`, `CARD_INSERTED`, `AUTHENTICATED`, `TRANSACTION_IN_PROGRESS`, `DISPENSING`, `CARD_BLOCKED`), fine-grained per-account `ReentrantLock` concurrency, hardware `CashDispenser` note calculation, compensating transaction balance revert on dispense failure, 3-attempt PIN lockout, and isolated `/api/atm/sim/*` engine.
- Strategy Pattern: `DenominationDispenseStrategy` interface with `GreedyDenominationDispenseStrategy` for note calculation across ₹2000, ₹500, ₹200, and ₹100 notes.
- Template Method Pattern: `Transaction` abstract base class with `WithdrawalTransaction` and `DepositTransaction`.

### Frontend
- 4 tabs: 🏧 ATM Terminal, 🔒 Concurrency Simulation, 📐 Class Diagram, 📋 Design Details.
- Hardware keypad terminal with PIN entry, cash slot animation, note breakdown badges, printable receipt modal, and interactive simulation timeline for 10-thread balance races, denomination mismatch compensation, and PIN lockout.

## LinkedIn Module
### Backend
- `LinkedInService`: Singleton facade managing professional profiles, connections, direct messaging, job postings, and weighted search ranking algorithms.
- Concurrency & Graph Safety: `ConcurrentHashMap` repository + canonical pair locking (`min(u1, u2) + "#" + max(u1, u2)`) preventing connection request race conditions.
- Strategy Pattern: `UserSearchRankingStrategy` (weighted 4-factor scoring: name, headline, skills, network degree) and `JobSearchRankingStrategy` (weighted 4-factor scoring: title, skill overlap, location, recency).
- Observer Pattern: `NotificationObserver` interface with `InAppNotificationObserver` and `LoggingNotificationObserver` for asynchronous event dispatching.
- Direct Messaging Guard: Enforces 1st-degree `ACCEPTED` connection status prior to message transmission.

### Frontend
- 6 tabs: 👤 My Profile & Network, 💼 Jobs & Applications, 💬 Messaging & Inboxes, 🕹️ Interactive 2D Simulation, 📐 Class Diagram, 📋 Design Details.
- Real-time profile skill editor, 1-click job application with match scoring, live direct chat bubble feed, and 4-node interactive simulation sandbox with visual network topology map and real-time telemetry event stream.

## Library Management Module
### Backend
- `LibraryService`: Singleton facade managing book catalog, multi-copy barcode tracking, loan state machine (`ACTIVE`, `RETURNED`, `OVERDUE`), member quota guards, and overdue sweeps.
- Concurrency & Double-Borrow Prevention: Dual-level concurrency locking — per-book `ReentrantLock` preventing last-copy race conditions and per-member mutex guarding borrow limit oversubscription.
- Factory Pattern: `MemberFactory` instantiating `STUDENT` (3 books / 14 days), `FACULTY` (10 books / 30 days), and `GENERAL` (5 books / 21 days) members with encapsulated `LoanPolicy`.
- Strategy Pattern: `FineStrategy` interface with `StandardFineStrategy` calculating daily overdue late fees upon return.
- Observer Pattern: `DueDateNotifier` broadcasting reminder events and overdue transition alerts to `LibraryNotificationObserver` instances via `@Scheduled` sweeps.
- Custom Exceptions: `BookNotAvailableException` (409), `BorrowLimitExceededException` (409), `MemberNotFoundException` (404), `LoanNotFoundException` (404), `InvalidReturnException` (400).

### Frontend
- 6 tabs: 📚 Book Catalog & Borrow, 👤 Member Dashboard & Active Loans, 🔔 Notifications & Alerts, 🕹️ Concurrency & Loan Simulation, 📐 Class Diagram, 📋 Design Details.
- Live searchable catalog with rack locations and copy availability chips, member active loan manager with due date countdown badges, accrued fine settlement, and interactive 2D simulation visualizer for last-copy races and accelerated sweep events.

## Airline Management Module
### Backend
- `AirlineService`: Singleton facade managing flight schedules, seat inventories, multi-passenger bookings, and tiered cancellation refunds.
- Concurrency & Deadlock Prevention: `SeatLockManager` using per-seat `ReentrantLock` (`flightId:seatNumber`), ascending-order multi-seat lock acquisition, and 5-minute hold TTL.
- State Machine Pattern: `SeatStatus` (`AVAILABLE` ➔ `HELD` ➔ `BOOKED`) and `BookingStatus` (`PENDING` ➔ `CONFIRMED` ➔ `CANCELLED` / `REFUNDED`).
- Strategy Pattern: `PricingStrategy` (`ClassBasedPricingStrategy`) and `RefundPolicy` (`TieredCancellationRefundPolicy` evaluating 100% >24h, 50% 24h–2h, 0% <2h).
- Custom Exceptions: `SeatNotAvailableException` (409), `HoldExpiredException` (410), `BookingFailedException` (422), `InvalidCancellationException` (400), `FlightNotFoundException` (404).

### Frontend
- 5 tabs: 🛫 Flight Search & Seat Map, 🎫 My Bookings & Refunds, 🕹️ Concurrency Simulation, 📐 Class Diagram, 📋 Design Details.
- Interactive 2D aircraft cabin layout with seat classes, window/aisle indicators, hold countdown timer (`⏱ 04:59`), multi-passenger booking checkout, and simulation sandbox.

## Concert Ticket Booking Module
### Backend
- `ConcertTicketInitializer` + `ConcertTicketSeedData`: seeds 2 venues (Wembley Arena, Madison Square Garden) and 3 events, each with its own VIP/GOLD/SILVER-or-GENERAL seat map generated from the venue's `Section` templates — seats are indexed per event (`eventId -> seatId -> Seat`), never shared across two events at the same venue.
- `ConcertTicketService`: facade over `selectSeats`, `confirmBooking`, `cancelBooking`, `releaseExpiredHolds` (`@Scheduled`), plus an isolated `/sim/*` sandbox on a second `ConcertTicketRepository`/`SeatLockManager` pair.
- Booking workflow: `selectSeats(eventId, seatIds, userId)` creates a **PENDING booking** the instant seats are held (not just a seat-level lock) with a 10-minute `holdExpiresAt`; `confirmBooking` re-validates the hold, charges via `PaymentProcessor`, and flips seats HELD ➔ BOOKED; `cancelBooking` releases a PENDING hold for free or, for a CONFIRMED booking, routes the refund through whichever `CancellationPolicy` the days-until-event resolve to.
- Concurrency & Deadlock Prevention: `SeatLockManager` — adapted from `airline`/`movieticket`'s `SeatLockManager` — using a fair per-seat `ReentrantLock` (`eventId:seatId`), ascending seat-id lock acquisition for multi-seat holds, and availability **re-read inside the lock** to close the check-then-act race. `expireStaleHolds` is the TTL reaper sweep (via `tryLock`, never blocks) that flips an expired HELD seat back to AVAILABLE.
- Strategy Pattern: `CancellationPolicy` interface with `FullRefundPolicy` (≥7 days: 100%), `PartialRefundPolicy` (2–6 days: 50%), `NoRefundPolicy` (<2 days: 0%), resolved by `CancellationPolicyFactory.resolve(eventDateTime, cancelTime)`.
- Custom Exceptions: `SeatNotAvailableException` (409), `HoldExpiredException` (410), `BookingFailedException` (422), `InvalidCancellationException` (400), `EventNotFoundException` (404), `VenueNotFoundException` (404), `BookingNotFoundException` (404). `ConcertTicketException` is the module base (no status of its own — listed in `DomainExceptionContractTest`'s `BASES` allowlist alongside `AirlineException`/`ZomatoException`).
- Tests: `ConcertTicketServiceTest` (full selectSeats → confirmBooking → cancelBooking / releaseExpiredHolds workflow, idempotency, payment-failure rollback, refund tiers), `CancellationPolicyTest` (each policy plus factory day-boundary resolution), `ConcertTicketRepositoryTest` (per-event seat isolation, id generators), `ConcertTicketConcurrencyTest` (N customers racing for the last seat — exactly one wins; 300-round repeated race; disjoint holds all succeed in parallel; expired hold genuinely frees the seat for a new hold; reaper sweep behaviour).

### Frontend
- 5 tabs: 🎫 Browse & Book, 📜 My Bookings, 🕹️ Interactive 2D Simulation, 📐 Class Diagram, 📋 Design Details.
- Browse & Book: live seat map polling via `usePolling`, 10-minute hold countdown driven by the server's `holdExpiresAt` (not a client-side guess), payment method selector, and an e-ticket card on confirmation.
- 8-step Interactive 2D Simulation calling the isolated `/api/concert-ticket/sim/*` endpoints: reset sandbox, load seat map, two customers racing for one seat (real concurrent requests — one is genuinely rejected), winner confirms payment, a third customer holds a different seat, the TTL reaper sweeps that expired hold, a fourth customer instantly re-holds the freed seat, then cancel + inspect the full event log with seat-status snapshots.

## Stock Brokerage Module
### Backend
- `StockBrokerService`: Singleton facade managing stocks, accounts, order books, and real-time observer dispatching.
- Order Book Pattern: Dual `TreeMap` price-time priority ladder (`bids` descending, `asks` ascending) with FIFO order queues per price level.
- Strategy Pattern: `OrderExecutionStrategy` interface with `MarketExecutionStrategy` (immediate depth sweep) and `LimitExecutionStrategy` (immediate match + resting remainder).
- Concurrency & Fund Reservation: Atomic balance and share pre-reservation under account mutexes (`account.getLock()`) plus per-symbol `ReentrantLock` for sequential matching engine mutation.
- Observer Pattern: `StockPriceObserver` interface with `InAppPriceObserver` and `LoggingPriceObserver` for live price updates.
- Custom Exceptions: `InsufficientFundsException` (400), `InsufficientStockException` (400), `InvalidOrderException` (400), `StockNotFoundException` (404), `AccountNotFoundException` (404), `OrderExecutionException` (422).

### Frontend
- 5 tabs: 📈 Trade & Portfolio, 📊 Live Order Book & Depth Ladder, 🕹️ Concurrency & Matching Simulation, 📐 Class Diagram, 📋 Design Details.
- Real-time stock ticker tape, order placement console with Market/Limit toggle, portfolio P&L breakdown, visual Bid/Ask depth chart with cumulative volume bars, and matching engine sandbox.

## Vending Machine Module
### Backend
- `VendingMachineService`: Singleton facade managing physical `VendingMachine` instance and isolated `simMachine` sandbox.
- State Pattern: `VendingMachineState` interface with concrete states (`IdleState`, `HasSelectionState`, `HasMoneyState`, `DispensingState`) guaranteeing safe lifecycle transitions.
- Chain of Responsibility Pattern: `ChangeDispenserChain` coordinates descending denomination handlers (`NOTE_500` → `NOTE_100` → `NOTE_50` → `NOTE_20` → `COIN_10` → `COIN_5` → `COIN_2` → `COIN_1`) with coin/note hopper inventory limits.
- Concurrency & Lock Safety: `ReentrantLock` guarding machine state transitions, inventory decrements, and cashbox balance updates.
- Initializer: `VendingMachineInitializer` seeds 12 matrix slots (3x4 grid: A1-A4 Beverages, B1-B4 Snacks, C1-C4 Confectionery/Fresh) and ₹3,550 in change hopper inventory.
- Custom Exceptions: `OutOfStockException` (409), `InsufficientPaymentException` (402), `InsufficientChangeException` (409), `SlotNotFoundException` (404), `ProductNotFoundException` (404), `InvalidStateException` (400).

### Frontend
- 5 tabs: 🥤 Vending Machine Hardware Showcase, 🔧 Admin & Inventory Dashboard, 🕹️ 2D Interactive Simulation, 📐 Class Diagram, 📋 Design Details.
- Realistic glass-front vending machine cabinet with illuminated 3x4 matrix slots, spiral coil animations, LCD monospace status screen, alphanumeric keypad (A-C, 1-4, CLR, ENT), coin/banknote acceptor, dispenser drop tray, and 8-step educational simulation sandbox.

## Coffee Machine Module
### Backend
- `CoffeeMachineService`: Singleton facade managing physical `CoffeeMachine` instance and isolated `simMachine` sandbox.
- Decorator Pattern: `CoffeeComponent` contract with `BaseCoffee` and chainable `CoffeeDecorator` classes (`ExtraShotDecorator`, `ExtraMilkDecorator`, `WhippedCreamDecorator`, `CaramelSyrupDecorator`, `OatMilkDecorator`), unwrapping multi-ingredient requirements and price deltas.
- Factory Pattern: `CoffeeFactory` managing recipe formulas (`Espresso`, `Latte`, `Cappuccino`, `Americano`, `Mocha`) and supporting dynamic runtime recipe registration.
- State Pattern: `CoffeeMachineState` interface with concrete states (`IdleState`, `SelectingState`, `PaymentPendingState`, `BrewingState`, `DispensedState`).
- Concurrency & Deadlock Prevention: `IngredientStore` multi-ingredient locking acquiring per-ingredient `ReentrantLock`s in deterministic ascending enum order, preventing deadlocks during overlapping ingredient races.
- Custom Exceptions: `InsufficientIngredientException` (409), `InvalidCoffeeTypeException` (404), `InsufficientPaymentException` (400), `InvalidStateOperationException` (400).

### Frontend
- 5 tabs: ☕ Order & Customize (Interactive Barista Console), 🎛️ Ingredient Inventory & Refill (Admin), 🔒 Concurrency Simulation, 📐 Class Diagram, 📋 Design Details.
- Dynamic liquid layer cup visualizer, live decorator price builder, hopper fill gauges with low-stock badges, and 8-step educational concurrency simulation sandbox.

## Logging Framework Module
### Backend
- `LoggingService`: Singleton facade managing hierarchical loggers, formatters, and multi-appender sinks with isolated simulation engine (`/sim/*`).
- Chain of Responsibility: `LogHandler` pipeline (`Trace` → `Debug` → `Info` → `Warn` → `Error` → `Fatal`) assembled via `LogHandlerChainBuilder`.
- Strategy Pattern: `LogFormatter` interface with `SimpleTextFormatter`, `JsonFormatter`, and `PatternFormatter` (with token interpolation), resolved via `LogFormatterFactory`.
- Observer & Strategy Pattern: `LogAppender` contract with `ConsoleAppender`, `FileAppender` (with simulated file rotation and byte limits), `DatabaseAppender` (SQL inserts), and `ElasticsearchAppender` (JSON document PUTs).
- Async Logging: `AsyncLogDispatcher` using bounded `ArrayBlockingQueue` and dedicated background worker thread with dropped log telemetry.
- Hierarchical Loggers: `Logger` (supporting parent-child level inheritance and MDC context tags like `traceId` / `userId`) managed by `LogManager` registry.

### Frontend
- 6 tabs: 🖥️ Live Logging Console & Stream, 🗄️ Multi-Appender Sinks, ⚙️ Logger Hierarchy & Configuration, 🕹️ 8-Step Interactive Pipeline Simulation with Telemetry HUD, 📐 Class Diagram, 📋 Design Details.
- Real-time log stream with level badges, MDC tags, live appender sink inspectors, and step-by-step pipeline execution replay.

## Stack Overflow Module
### Backend
- `StackOverflowInitializer` + `StackOverflowRepository.seed()`: 3 users, 8 tags, 3 questions, 2 answers (one pre-accepted). `seed()` is reused by the live boot path and independently by the sim sandbox's reset, so the two never drift.
- `StackOverflowService`: Facade — `postQuestion`/`postAnswer`/`addComment` (tag validation, reputation rewards for authoring), delegates every vote/accept/close to `VotingService`.
- `VotingService`: Owns every compound mutation touching both a post's score and its author's reputation. Locks in a fixed **Question ≤ Answer ≤ User** tier order (never acquired out of order by any method), documented and proved deadlock-free in its class javadoc. `voteQuestion`/`voteAnswer` reject a self-vote, are a no-op on a repeated identical vote, and apply only the net delta on a changed vote. `acceptAnswer` holds the question lock for the whole call, unsets any previous accepted answer one answer-lock at a time, and awards a one-time `+15` bonus — not a per-vote strategy (see the bug this replaced, below). `closeQuestion` is author-only and rejects closing twice.
- `Votable` interface (`getId`/`getAuthorId`/`getScore`/`setScore`/`getVotes`): `Question` and `Answer` both implement it so `VotingService.applyVote` is one generic method, not duplicated per type.
- Strategy Pattern: `ReputationStrategy` (`QuestionReputationStrategy`: UPVOTE +5/DOWNVOTE -2, `AnswerReputationStrategy`: UPVOTE +10/DOWNVOTE -2) resolved by `ReputationStrategyFactory.forTarget(VoteTargetType)`.
- `QuestionStatus` state machine: OPEN → ANSWERED (on accept) → CLOSED (author-only, from either); CLOSED rejects new answers and a second close.
- Exception hierarchy: `StackOverflowException extends com.lld.config.DomainException` with `QuestionNotFoundException`/`AnswerNotFoundException`/`UserNotFoundException` (404), `TagNotFoundException`/`SelfVoteException`/`InvalidVoteTypeException` (400), `NotQuestionAuthorException` (403), `QuestionClosedException`/`InvalidQuestionTransitionException` (409).
- Isolated `/api/stackoverflow/sim/*` sandbox: separate `StackOverflowRepository` + `VotingService` instance, `reset`/`ask`/`answer`/`vote`/`accept`/`close`/`race`/`events`.
- Tests: `StackOverflowServiceTest`, `VotingServiceTest` (pins exact vote/reputation deltas, self-vote rejection, vote-change idempotency, the accepted-answer bonus firing exactly once), `ReputationStrategyTest`, `StackOverflowRepositoryTest`, `StackOverflowConcurrencyTest` (60 concurrent first-time voters on one answer, 300 rounds of two threads racing to accept different answers).

### Frontend
- 6 tabs: ❓ Questions, ✍️ Ask, 🏆 Leaderboard, Interactive 2D Simulation, Class Diagram, Design Details.
- Live polling (`usePolling`) on the question list, an open question's detail, and the leaderboard; an acting-user picker makes self-vote rejection directly demonstrable in the operational tabs, not just the sim.
- 8-step Simulation: reset, ask, answer, upvote, a self-vote rejected in real time, accept, a 5-voter concurrent race on one answer, close-then-refused-answer — all against `/sim/*`, with a live telemetry HUD (question status, answer score, author reputation, accepted flag) and an event log.

## Car Rental Module
### Backend
- `CarRentalInitializer`: 3 branches (Downtown SF, SFO Airport, San Jose), 8 vehicles across `HATCHBACK`/`SEDAN`/`SUV`/`VAN`/`TRUCK` (one seeded `MAINTENANCE`), 3 customers, and a couple of demo reservations (one `PENDING`, one `CONFIRMED`) so the UI shows something meaningful on first load.
- `CarRentalService`: Facade over `searchAvailableVehicles`, `estimateCost`, `reserveVehicle`, `confirmReservation`, `pickup`, `returnVehicle`, `cancelReservation`, plus isolated sim methods (`simReserve`, `simConfirm`, `simPickup`, `simReturn`, `simCancel`) against a second `CarRentalRepository`/`ReservationLockService` pair — same shape as Splitwise's `simRepository`.
- **Overlapping-Interval Reservation Locking (the concurrency centerpiece)**: `ReservationLockService` claims a per-vehicle fair `ReentrantLock` (`computeIfAbsent`, same idiom as `DriverAssignmentService`) and, **inside** the lock, re-reads the vehicle's *entire* reservation set and scans it for a date overlap before creating the new one. This is a different lock shape from a single free/busy flag: the invariant being protected is "does this range overlap any member of a set", not "is one boolean still true", so the critical section has to re-read and re-scan the whole set, not just re-check one field. Half-open interval overlap (`s1 < e2 && s2 < e1`) means a same-day return + pickup is not a conflict.
- `VehicleStatus` (`AVAILABLE`, `RENTED`, `MAINTENANCE`, `RETIRED`) is a fleet-level gate only — `MAINTENANCE`/`RETIRED` block all new reservations, but `AVAILABLE`/`RENTED` never gate a specific date range. A vehicle can carry any number of non-overlapping future reservations; per-date availability is always answered by scanning the reservation set, never by this field. (An earlier `RESERVED` status was cut for exactly this reason — see `data/design/car-rental.js`'s tradeoffs section and `RCA.md`'s RCA-008 sibling reasoning.)
- `ReservationStatus`: `PENDING` (holds the calendar) → `CONFIRMED` (paid) → `ACTIVE` (picked up) → `COMPLETED` (returned), or `CANCELLED` from the first two — legal transitions declared in one table (`canTransitionTo`/`allowedNext`/`isTerminal`) and enforced through a single `transition()` gate in `CarRentalService`, same idiom as Uber's `RideStatus`.
- Strategy + Factory tiered pricing: `PricingStrategy` interface with `StandardPricingStrategy` (1–2 days, base rate), `WeeklyDiscountPricingStrategy` (3–6 days, 10% off) and `LongRentalDiscountPricingStrategy` (7+ days, 20% off), resolved by `PricingStrategyFactory.forDuration(days)`. Base daily rates live on the `VehicleType` enum (`HATCHBACK` ₹1200 … `TRUCK` ₹4000), so adding a category is one edit rather than a new pricing `switch` arm. `PricingStrategyFactory` carries an explicit `@Component("carRentalPricingStrategyFactory")` bean name — `parkinglot` has an unrelated class with the same simple name, and Spring's default bean naming would otherwise collide (RCA-008).
- Late fee: returning after the booked end date adds `1.5 × the category's daily rate` per late day to `actualCost`.
- Exception hierarchy: `CarRentalException extends com.lld.config.DomainException` with `VehicleNotFoundException`/`CustomerNotFoundException`/`BranchNotFoundException`/`ReservationNotFoundException` (404), `VehicleNotAvailableException` (409, maintenance/retired or date overlap), `InvalidReservationDatesException`/`InvalidReservationTransitionException` (400), `PaymentFailedException` (422).
- `PaymentProcessor` (`@Component("carRentalPaymentProcessor")`): authorizes on `confirmReservation`, refunds on `cancelReservation` for an already-paid reservation.
- Tests: `CarRentalServiceTest` (full lifecycle + every rejection), `PricingStrategyTest` (tier arithmetic, boundary duration, factory resolution), `CarRentalRepositoryTest` (storage, atomic id generation, branch/status filtering), `CarRentalConcurrencyTest` (customers racing for the same/overlapping dates on one vehicle, non-overlapping reservations on the same vehicle all succeeding, disjoint vehicles not contending, a 300-round repeated race).

### Frontend
- 5 tabs: 🚗 Reserve a Vehicle, 🏢 Fleet Dashboard, Interactive 2D Simulation, Class Diagram, Design Details.
- Reserve tab: register/select a customer, search available vehicles by branch/category/dates (live overlap-aware availability), see a live tiered-pricing estimate, reserve, then confirm/pick up/return/cancel from a polled "My Reservations" list.
- Fleet tab: live-polled vehicle grid grouped by branch with status badges.
- 8-step interactive simulation against isolated `/api/car-rental/sim/*` endpoints — steps 5–6 fire two customers' reservation requests for the *same vehicle and overlapping dates* concurrently via `Promise.allSettled`, then render which one the backend's per-vehicle lock actually accepted and which it rejected, so the concurrency guarantee is demonstrated live rather than asserted in prose.

## CricInfo Module
### Backend
- `CricinfoInitializer`: seeds two fictional squads (Coastal Kings, Northern Titans, 11 players each) via `CricinfoService.seedInitialMatch()` — a T20 already LIVE with a hand-authored opening sequence (1.3 overs, 1 wicket) so the scorecard shows something meaningful on first load, plus a second UPCOMING match (ODI) before its toss.
- `CricinfoService`: facade over `createMatch`, `performToss`, `startMatch`, `recordBall`, `startNextInnings`, `abandonMatch`, `getScorecard`, `getCommentary`, `getEvents`, `getObserverStatus`/`toggleObserver`, plus an isolated `sim*` sandbox (own `CricinfoRepository`, `MatchPublisher`, `BallRecordingEngine`, and observer instances) mirroring `SplitwiseService`'s `simRepository` pattern.
- **Observer Pattern, ball-by-ball**: `MatchPublisher` (Subject) fans a `BallEvent` out to a `CopyOnWriteArrayList<BallEventObserver>` — `ScorecardProjectionObserver` (folds the ball into `Innings` totals/stats and rebuilds the `Scorecard` projection — the "live scorecard projection"), `PlayerCareerStatsObserver` (updates `Player.careerStats` independently), `CommentaryObserver` (derives ball-by-ball text, can be unsubscribed at runtime), `BallEventAuditObserver` (sequence-numbered audit log feeding `/sim/telemetry`). None of the four observers know the others exist.
- **Thread safety with intent**: `BallRecordingEngine` holds a per-match `ReentrantLock` (looked up by `matchId`, same shape as zomato's per-agent lock) around numbering the ball, appending it to `Innings.balls`, and synchronously publishing to every observer — so "append + fold into scorecard" is atomic per match, and two ball events racing for the same match can never interleave into a lost or double-counted run. `CricinfoConcurrencyTest` fires N concurrent deliveries at one match and asserts the total equals a strictly sequential reference run — not just "no crash".
- `MatchStatus`: `UPCOMING → LIVE → INNINGS_BREAK → LIVE → COMPLETED`, or `ABANDONED` from any non-terminal state — one transition table, same idiom as `RideStatus`/`OrderStatus`. Strike rotation on odd runs, over-completion (and the "same bowler can't bowl consecutive overs" rule), and all-out/overs-exhausted innings completion are modeled explicitly in `BallRecordingEngine`.
- Exception hierarchy: `CricinfoException extends com.lld.config.DomainException` with `MatchNotFoundException`/`TeamNotFoundException`/`PlayerNotFoundException` (404), `InvalidMatchStateException`/`InningsCompleteException` (409), `InvalidBallException` (400, e.g. runs off a wide, or a wicket type that requires a `fielderId`).
- Tests: `CricinfoServiceTest` (lifecycle + scoring workflow), `BallEventObserverTest` (the Observer pattern itself — fan-out, subscribe/unsubscribe, independent derived views), `MatchStatusTest` (transition table), `CricinfoRepositoryTest` (storage), `CricinfoConcurrencyTest` (the atomicity invariant, safe concurrent subscribe/unsubscribe during publish, disjoint matches scoring independently).

### Frontend
- 5 tabs: 🏏 Live Scoring, 📋 Matches & Observers, Interactive 2D Simulation, Class Diagram, Design Details.
- Live Scoring polls the scorecard/commentary for whichever match is LIVE/INNINGS_BREAK and exposes a full ball console (runs, extras, wicket types) plus batting/bowling tables.
- Matches & Observers manages match creation/toss/start and renders the four `BallEventObserver`s with live subscribe/unsubscribe toggles — a direct UI window into the Subject/Observer pattern.
- 8-step Interactive 2D Simulation calling isolated `/api/cricinfo/sim/*` endpoints — each step is (almost always) exactly one ball, including a step that unsubscribes `CommentaryObserver` mid-innings and one that resubscribes it, proving the toggle live.

## Running
```bash
cd backend && mvn package && java -jar target/lld-all-0.0.1-SNAPSHOT.jar   # port 9090
cd frontend && npm run dev                                                 # port 3000
```
The Vite dev proxy and the Docker nginx config both forward `/api`, `/swagger-ui`, `/swagger-ui.html`
and `/v3/api-docs` to the backend, so the in-app Swagger link works on either origin.
Override with `VITE_BACKEND_URL` (proxy target) or `VITE_SWAGGER_URL` (link href).

## Testing
```bash
cd backend && mvn test        # 203 tests, 30 classes
cd frontend && npx vitest run # 250 tests, 3 files
```

### Cross-cutting suites — keep these green
| Suite | Guards |
|---|---|
| `config/DomainExceptionContractTest` | Every concrete `DomainException` declares `@ResponseStatus`, and none maps to a 5xx. A new exception cannot silently become a 500. |
| `config/GlobalExceptionHandlerTest` | All 23 exception→status mappings, explicitly. Changing a documented status is now a visible edit. |
| `config/ErrorContractIntegrationTest` | Drives real MockMvc requests, proving the advice is registered and that framework routing is untouched. |
| `config/ErrorResponseTest` | Null/blank-message safety, including an assertion that the old `Map.of` idiom throws. |
| `__tests__/designDataCoverage.test.js` | Every module id any page requests resolves to design data and a diagram; entry shape; no duplicate barrel keys; no dangling diagram edges. |
| `__tests__/routing.test.js` | Every home card links to a real route; every route has a file; every page file is routed; catch-all exists. |

When adding a module, these suites tell you what is missing — a new page with no design
content, or a new exception with no status, fails the build rather than the user.

