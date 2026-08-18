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
- Frontend: one folder per LLD in `src/lld/`, each with `{Name}Page.jsx` + `api.js`.
- **Terminal Execution**: ALWAYS use WSL (`wsl <command>`) for running commands.
- **Server Execution**: NEVER start backend or frontend automatically — the user starts/stops servers manually.
- **Incident Tracking & Post-Resolution RCAs**: Maintain `RCA.md` in the root directory. Whenever an important/non-trivial issue is diagnosed and resolved (such as port collisions, concurrency races, build failures, serialization bugs, or environment discrepancies), ALWAYS add a structured Root Cause Analysis entry to `RCA.md` immediately after resolving it. Document: (1) Overview & Severity, (2) Symptoms & Error Logs, (3) Root Cause, (4) Diagnostic Commands, (5) Step-by-Step Resolution, and (6) Preventative Measures.

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
- `src/data/designDetails.js` — Content for each module's design details.

## Uber Module
### Backend
- `UberInitializer`: Sample riders & drivers (UBER_GO, UBER_XL, UBER_PREMIUM).
- `UberService`: estimate, requestRide, acceptRide, declineRide, verifyOtpAndStart, arriveAtDestination, completeTrip, cancelTrip.
- `RideStatus`: REQUESTED, ACCEPTED, ONGOING, DESTINATION_REACHED, PAYMENT_PENDING, COMPLETED, PAYMENT_FAILED, CANCELLED.
- `PaymentProcessor`: Validates and completes rider payments (`UPI`, `CARD`, `CASH`).

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

## Running
```bash
cd backend && mvn package && java -jar target/lld-all-0.0.1-SNAPSHOT.jar
cd frontend && npm run dev
```

## Testing
```bash
cd backend && mvn test
cd frontend && npx vitest run
```

