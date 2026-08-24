# Low-Level Design with UI

SDE-2 interview preparation portfolio (2+ years experience). **45 LLD projects** in a **single unified backend + frontend** architecture — Java 17 Spring Boot backend + React 19 / Vite frontend.

---

## Projects Overview

| # | Project | Domain | Key Design Patterns & Features |
|---|---------|--------|--------------------------------|
| 1 | [Parking Lot](#1-parking-lot) | Multi-level parking | Singleton, Strategy (pricing/spot), Factory, ReentrantLock |
| 2 | [Zomato](#2-zomato) | Food delivery | State Machine, Strategy (payment), Observer, OTP Handoff |
| 3 | [Uber](#3-uber) | Ride-hailing | State Machine (transition table), Strategy (standard/surge pricing), Per-Driver Lock, Haversine Distance, OTP |
| 4 | [Stack Overflow](#4-stack-overflow) | Q&A platform | Strategy + Factory (reputation), deterministic Question≤Answer≤User lock ordering, Votable interface, State Machine (question status) |
| 5 | [Tic Tac Toe](#5-tic-tac-toe) | 2-player game | State Machine, Minimax AI Strategy, Undo History |
| 6 | [Snake & Ladders](#6-snake--ladders) | Multiplayer board game | State Machine, Board & Snakes/Ladders Mapping |
| 7 | [ATM](#7-atm) | Banking ATM | State Machine, Denomination Strategy, ReentrantLock, Lockout |
| 8 | [Splitwise](#8-splitwise) | Expense sharing | Split Strategies (Equal/Percentage/Exact), Graph Debt Simplification |
| 9 | [Elevator](#9-elevator) | Elevator control | SCAN Scheduling Strategy, Proximity Scoring, ReentrantLock |
| 10 | [Library Management](#10-library-management) | Book Catalog & Loans | Strategy (fines), Factory (members), Observer (due date), Per-Book ReentrantLock |
| 11 | [Movie Ticket Booking](#11-movie-ticket-booking) | Cinema seats & shows | Per-Seat ReentrantLock, Hold TTL, Strategy, Observer |
| 12 | Hotel Management | Room reservation | State Machine, Strategy, Factory |
| 13 | [Airline Reservation](#13-airline-reservation) | Flight booking & seats | State Machine (holds/bookings), Strategy (pricing/refunds), Per-Seat ReentrantLock |
| 14 | [Coffee Machine](#14-coffee-machine) | Ingredient & brew engine | State Pattern, Factory (Recipes), Decorator (Customizations), Deadlock-Safe Multi-Ingredient Locking |
| 15 | Digital Wallet | Payment & ledger | Command Pattern, Transactional Lock |
| 16 | Chess | 2-Player strategy game | Command, State, Strategy |
| 17 | Ludo | Multiplayer board game | State Machine, Game Loop |
| 18 | Inventory Management | Stock & warehouse | Observer, Strategy |
| 19 | [Shopping Cart](#19-online-shopping-system-shopping-cart) | E-commerce & checkout | Command (Undo), Strategy (Payment), Ascending Lock Ordering |
| 20 | Minesweeper | Grid mine game | Recursion, Game Loop |
| 21 | [Vending Machine](#21-vending-machine) | State-based dispenser | State Pattern (Idle/Selection/Money/Dispensing), Chain of Responsibility Change Hopper |
| 22 | Logging Framework | Log sink engine | Chain of Responsibility, Singleton |
| 23 | Traffic Signal | Signal timing engine | State Pattern, Observer |
| 24 | Task Management System | Task workflow | State Pattern, Strategy |
| 25 | [LinkedIn](#25-linkedin) | Professional network | Graph Model, Strategy (ranking), Observer (alerts), Pair Locking |
| 26 | LRU Cache | In-memory cache | Doubly Linked List + HashMap |
| 27 | [Pub Sub System](#27-pubsub-system-message-broker) | Message broker | Observer, Dedicated Per-Subscriber FIFO Worker Threads |
| 28 | [Car Rental System](#28-car-rental-system) | Vehicle fleet & booking | Overlapping-Interval Per-Vehicle Lock, Strategy + Factory (tiered pricing), State Machine |
| 29 | Online Auction System | Bidding engine | Observer, Strategy |
| 30 | Restaurant Management | Order & kitchen workflow | State Machine, Factory |
| 31 | Social Network | Posts & feeds | Graph Model, Observer |
| 32 | [Concert Ticket Booking](#32-concert-ticket-booking) | Event seats & reservation | Per-Seat ReentrantLock, Hold TTL, Strategy (refund policy) |
| 33 | CricInfo | Live cricket scorecard | Observer Pattern, Event Listener |
| 34 | Course Registration System | Student enrollment | Strategy, Observer |
| 35 | [Stock Brokerage Platform](#35-stock-brokerage-platform) | Trading & portfolio | Order Book (Price-Time Priority), Strategy (Market/Limit), Observer Quotes |
| 36 | Music Streaming Service | Audio catalog & playlists | Strategy, Factory |
| 37 | FooBar Alternately | Multithreading concurrency | Semaphore / ReentrantLock |
| 38 | Zero Even Odd | Multithreading concurrency | Semaphore Synchronization |
| 39 | Fizz Buzz Multithreaded | Multithreading concurrency | CyclicBarrier / Condition |
| 40 | Building H2O | Multithreading concurrency | Barrier / Semaphore |
| 41 | Thread-Safe TTL Cache | Concurrent caching | Scheduled Executor, ConcurrentHashMap |
| 42 | Concurrent HashMap | Concurrent data structure | Segment Locking / Bucket Lock |
| 43 | Blocking Queue | Concurrent queue | Producer-Consumer, ReentrantLock + Condition |
| 44 | Concurrent Bloom Filter | Probabilistic structure | BitSet + Hash Functions |
| 45 | Multi-threaded Merge Sort | Parallel sorting | ForkJoinPool / RecursiveTask |

---

## Architecture

```
lld-with-ui/
├── backend/                     ← Spring Boot app, single JAR (Port 9090)
│   └── src/main/java/com/lld/
│       ├── config/              ← CORS, OpenAPI, and the shared error contract
│       │   ├── DomainException      ← base class for every module's exceptions
│       │   ├── GlobalExceptionHandler ← maps them to real HTTP statuses
│       │   └── ErrorResponse        ← the one error body shape, null-safe
│       │
│       ├── airline/  atm/  auction/  chess/  coffeemachine/  digitalwallet/
│       ├── elevator/  hotel/  inventory/  library/  linkedin/  logging/
│       ├── lrucache/  ludo/  minesweeper/  movieticket/  parkinglot/  pubsub/
│       ├── shoppingcart/  snakeladders/  socialnetwork/  splitwise/
│       ├── stackoverflow/  stockbroker/  taskmanagement/  tictactoe/
│       └── trafficsignal/  uber/  vendingmachine/  zomato/     (30 modules)
│
│   Each module follows the same layering:
│       controller/ · service/ · model/ · repository/ · exception/
│       + a package per design pattern it actually uses
│         (strategy/ factory/ observer/ state/ command/ decorator/ chain/)
│
├── frontend/                    ← React 19 + Vite SPA (Port 3000)
│   └── src/
│       ├── components/          ← ClassDiagram, DesignDetails, ThemeToggle, ui/
│       ├── data/
│       │   ├── design/          ← one designDetails file per module
│       │   ├── diagrams/        ← one classDiagrams file per module
│       │   ├── designDetails.js ← barrel index
│       │   ├── classDiagrams.js ← barrel index
│       │   └── moduleKeys.js    ← the single module-id → data-key resolver
│       ├── lld/                 ← one folder per LLD: {Name}Page.jsx + api.js
│       └── __tests__/           ← route + design-data coverage guards
│
├── AGENTS.md                    ← Working context and conventions
├── RCA.md                       ← Root Cause Analysis & incident post-mortems
└── README.md
```

---

## Quick Start

```bash
# Terminal 1 — Start Java Spring Boot Backend (Port 9090)
cd backend && mvn spring-boot:run

# Terminal 2 — Start React + Vite Frontend (Port 3000)
cd frontend && npm run dev
```

Open **http://localhost:3000** to access the portfolio dashboard.
(`vite.config.js` pins port 3000; `start.sh` and `docker-compose.yml` both agree.)

### ⚡ Interactive Swagger API Documentation
- **Swagger UI Console**: [http://localhost:9090/swagger-ui.html](http://localhost:9090/swagger-ui.html) *(or `/swagger-ui/index.html`)*
- **OpenAPI 3.0 JSON Specification**: [http://localhost:9090/v3/api-docs](http://localhost:9090/v3/api-docs)
- The in-app **⚡ Swagger API** button resolves on whatever origin you are on: the Vite dev
  server and the Docker nginx both proxy `/swagger-ui` and `/v3/api-docs` to the backend.
  Override with `VITE_SWAGGER_URL` if the backend lives elsewhere.

### 🛠️ Incident Log & Root Cause Analysis (RCA)
- All critical issues, port collisions, and concurrency post-mortems are tracked in [RCA.md](file:///c:/Users/Hp/OneDrive/Desktop/lld-with-ui/RCA.md).

---

## Design Patterns Reference

| Pattern | Module Usage | Rationale |
|---------|--------------|-----------|
| **Singleton** | `AtmService`, `ShoppingCartService`, `PubSubService` | Centralized system state facade |
| **Strategy** | `DenominationDispenseStrategy`, `PaymentStrategy`, `SplitStrategy` | Pluggable runtime algorithms |
| **Command** | `AddItemCommand`, `RemoveItemCommand`, `UpdateQuantityCommand` | Encapsulates cart actions for single-step Undo |
| **Observer** | `SeatMapNotifier`, `SubscriberWorker` | Decoupled event publication & async delivery |
| **State Machine** | `ATMState`, `OrderStatus`, `RideStatus`, `SeatStatus` | Formal lifecycle transitions with state guards |
| **Template Method** | `Transaction` (`WithdrawalTransaction`, `DepositTransaction`) | Encapsulates invariant transaction lifecycle |
| **Concurrency** | `ReentrantLock`, `AtomicInteger`, `ConcurrentHashMap` | Deadlock-free fine-grained thread safety |

---

## Error Handling Contract

Every module reports failures the same way. A module's base exception extends
`com.lld.config.DomainException`; each concrete exception declares its HTTP status:

```java
@ResponseStatus(HttpStatus.CONFLICT)
public class SeatNotAvailableException extends AirlineException { ... }
```

`GlobalExceptionHandler` (`@RestControllerAdvice`) resolves that status and returns a
consistent body, so the UI always has a reason to show:

```json
{
  "error": "Seat 12A is already occupied or held by another passenger.",
  "code": "SeatNotAvailableException",
  "status": 409,
  "timestamp": "2026-08-20T17:42:03.918Z"
}
```

| Status | Meaning | Examples |
|---|---|---|
| `400 Bad Request` | Invalid input or a rejected state transition | `InvalidCancellationException`, `InvalidReturnException`, `InsufficientFundsException`, `InvalidOrderException` |
| `401 / 403` | Bad credentials / action not permitted | `InvalidCredentialsException`, `UnauthorizedActionException` |
| `404 Not Found` | Unknown identifier | `FlightNotFoundException`, `MemberNotFoundException`, `StockNotFoundException`, `AccountNotFoundException` |
| `409 Conflict` | Lost a race, or a quota/uniqueness rule | `SeatNotAvailableException`, `BookNotAvailableException`, `BorrowLimitExceededException`, `UserAlreadyExistsException` |
| `410 Gone` | A time-boxed hold expired | `HoldExpiredException` |
| `422 Unprocessable` | Understood but not executable | `BookingFailedException`, `OrderExecutionException` |

A domain exception never maps to a 5xx — a rule violation is the caller's problem, and
`DomainExceptionContractTest` fails the build if one does.

---

## Testing

```bash
cd backend  && mvn test        # 203 tests across 30 classes
cd frontend && npx vitest run  # 250 tests across 3 files
```

Six suites are cross-cutting rather than per-module, and they exist because each one
corresponds to a defect that shipped silently (see [RCA.md](RCA.md)):

| Suite | Guards against |
|---|---|
| `DomainExceptionContractTest` | A new exception silently returning 500 |
| `GlobalExceptionHandlerTest` | A documented status code drifting from the code |
| `ErrorContractIntegrationTest` | The advice not being registered, or swallowing framework routing |
| `ErrorResponseTest` | An error handler throwing on a null message |
| `designDataCoverage.test.js` | A page whose Design Details or Class Diagram tab is empty |
| `routing.test.js` | A home-page card that navigates to a blank screen |

---

## Project Details

### 1. Parking Lot

#### Key Features
- **Multi-Level Spot Tracking**: Manages spots across 3 floors tailored for CAR, BIKE, and TRUCK vehicle types.
- **Ticket & Spot Strategy**: Dynamic spot assignment and hourly pricing calculation.
- **Gate Management**: Controlled Entry (G1, G2) and Exit (G3, G4) gate workflows.

#### API Endpoints
- `GET /api/parking/gates`
- `POST /api/parking/entry`
- `POST /api/parking/exit`
- `GET /api/parking/floors`
- `GET /api/parking/spots/available`
- `GET /api/parking/tickets/active`

---

### 2. Zomato

#### Key Features
- **Multi-Entity Domain**: Customer, Restaurant, MenuItem, DeliveryAgent, Order, Payment, and Notification.
- **Guarded Order Lifecycle**: State machine (`PLACED` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `READY_FOR_PICKUP` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED` / `CANCELLED`).
- **OTP Verification & Payment Strategies**: 4-digit delivery handoff OTP with UPI, Card, Wallet, COD support.
- **Interactive 2D Simulation**: Night city map with kitchen smoke particles, animated delivery agent, and live HUD.

#### API Endpoints
- `GET /api/zomato/restaurants`
- `POST /api/zomato/orders`
- `POST /api/zomato/orders/{id}/confirm`
- `POST /api/zomato/orders/{id}/prepare`
- `POST /api/zomato/orders/{id}/ready`
- `POST /api/zomato/orders/{id}/deliver`
- `POST /api/zomato/orders/{id}/cancel`

---

### 3. Uber

#### Key Features
- **Fare Estimation**: Haversine distance and duration calculation across Go, XL, and Premium rides.
- **Pricing Strategy**: `FarePricingStrategy` with standard (₹25 base + distance × per-km rate) and surge (1.8x default, clamped 1.0–5.0) implementations resolved by `FarePricingStrategyFactory`. Per-km rates live on the `VehicleType` enum. The estimate reports which strategy priced it.
- **Ride State Machine**: `RideStatus` declares its legal transitions in one table (`canTransitionTo` / `allowedNext` / `isTerminal`) and `UberService` routes every status change through a single gate. COMPLETED and CANCELLED are terminal; a failed payment is retryable.
- **Race-Free Driver Assignment**: `DriverAssignmentService` claims a driver under a fair per-driver `ReentrantLock`, re-reading availability **inside** the lock. Two riders accepting the same driver can no longer both win.
- **Driver Request Dispatch**: Broadcasts ride requests with explicit Accept/Decline decision options.
- **OTP Handoff**: 4-digit OTP verification before a trip may start.
- **Typed Exceptions**: `UberException` on the shared `DomainException` contract — 404 for unknown ride/driver/rider, 409 for an unavailable driver, 400 for an illegal transition or bad OTP, 422 for a failed payment.

#### API Endpoints
- `GET /api/uber/estimate`
- `POST /api/uber/rides`
- `GET /api/uber/drivers/{driverId}/requests`
- `PUT /api/uber/rides/{id}/accept`
- `PUT /api/uber/rides/{id}/verify-otp`
- `PUT /api/uber/rides/{id}/complete`

---

### 4. Stack Overflow

#### Key Features
- **Q&A Engine**: Question posting (with tag validation), answer submissions, comment threads, keyword/tag/author search.
- **Reputation Strategy + Factory**: `ReputationStrategy` (question upvote +5/downvote -2, answer upvote +10/downvote -2) resolved by `ReputationStrategyFactory` — never an inline switch. The accepted-answer bonus (+15) is a one-time constant applied by `VotingService.acceptAnswer`, not a per-vote strategy; an earlier draft folded it into the strategy interface and it silently re-fired on every subsequent vote, including downvotes (see `RCA.md`).
- **Deterministic locking**: `VotingService` acquires locks in a fixed **Question ≤ Answer ≤ User** tier order for every vote, accept and close, so concurrent votes on the same post can neither deadlock nor lose an update. Votes are idempotent (a repeated vote is a no-op) and vote changes apply only the net delta.
- **Votable interface**: `Question` and `Answer` both implement it so the vote/reputation math is written once, generically.
- **Question status state machine**: OPEN → ANSWERED (on accept) → CLOSED (author-only); CLOSED rejects new answers and a second close.
- **Isolated simulation sandbox**: `/api/stackoverflow/sim/*` runs an 8-step scripted walkthrough — including a 5-voter concurrent race — against a separate repository so it never touches live data.

#### API Endpoints
- `GET /api/stackoverflow/questions`
- `GET /api/stackoverflow/questions/{id}`
- `POST /api/stackoverflow/questions`
- `POST /api/stackoverflow/questions/{id}/answers`
- `POST /api/stackoverflow/questions/{id}/vote`
- `POST /api/stackoverflow/questions/{id}/accept`
- `POST /api/stackoverflow/questions/{id}/close`
- `POST /api/stackoverflow/answers/{id}/vote`
- `POST /api/stackoverflow/comments`
- `GET /api/stackoverflow/users`, `GET /api/stackoverflow/tags`
- `POST /api/stackoverflow/sim/reset`, `GET /api/stackoverflow/sim/state`, `POST /api/stackoverflow/sim/{ask,answer,vote,accept,close,race}`, `GET /api/stackoverflow/sim/events`

---

### 5. Tic Tac Toe

#### Key Features
- **Multi-Mode Gameplay**: Human vs Human and Human vs AI (Random vs Unbeatable Minimax Strategy).
- **Move History & Undo**: Step-by-step move history log with atomic Undo move support.
- **2D Arcade Simulation**: Glowing 3D grid, AI brain pulse indicator, and laser winning line visualizer.

#### API Endpoints
- `POST /api/tictactoe/games`
- `GET /api/tictactoe/games/{id}`
- `POST /api/tictactoe/games/{id}/move`
- `POST /api/tictactoe/games/{id}/undo`
- `POST /api/tictactoe/games/{id}/reset`

---

### 6. Snake & Ladders

#### Key Features
- **Multiplayer Board**: 10x10 board supporting 2-4 players with dice roll engine.
- **Dynamic Mappings**: Snake and ladder position transformations with instant win detection.

#### API Endpoints
- `POST /api/snakeladders/games`
- `GET /api/snakeladders/games/{id}`
- `POST /api/snakeladders/games/{id}/roll`

---

### 7. ATM

#### Key Features
- **Hardware Session State Machine**: Guarded state transitions (`IDLE` ➔ `CARD_INSERTED` ➔ `AUTHENTICATED` ➔ `TRANSACTION_IN_PROGRESS` ➔ `DISPENSING` ➔ `CARD_BLOCKED`).
- **Denomination Dispensing Strategy**: Strategy Pattern using `GreedyDenominationDispenseStrategy` across ₹2000, ₹500, ₹200, and ₹100 notes.
- **Fine-Grained Concurrency**: Per-account `ReentrantLock` preventing balance overselling under 10-thread withdrawal races.
- **Compensating Refund Transaction**: Automatically credits account balance back if cash dispenser note combination fails after debiting.
- **Card Security Lockout**: Tracks failed PIN attempts and blocks card (`CARD_BLOCKED`) after 3 consecutive failures.
- **4-Tab React UI**: Keypad Terminal, Concurrency Simulation, Class Diagram, and Design Details.

#### API Endpoints
- `POST /api/atm/insert-card`
- `POST /api/atm/authenticate`
- `GET /api/atm/{accountNumber}/balance`
- `POST /api/atm/{accountNumber}/withdraw`
- `POST /api/atm/{accountNumber}/deposit`
- `POST /api/atm/eject`
- `GET /api/atm/{accountNumber}/transactions`
- `GET /api/atm/dispenser`
- `POST /api/atm/sim/reset`
- `POST /api/atm/sim/authenticate`
- `POST /api/atm/sim/withdraw`
- `GET /api/atm/sim/events`
- `GET /api/atm/sim/snapshots`

---

### 8. Splitwise

#### Key Features
- **Expense Split Strategies**: Strategy Pattern resolving `SplitType` (`EQUAL`, `PERCENTAGE`, `EXACT`) via `SplitStrategyFactory` to calculate participant shares and remainder handling.
- **Min-Cash-Flow Debt Simplification**: Greedy graph algorithm optimizing $O(N^2)$ pairwise debts down to at most $N-1$ settlement transactions in $O(N \log N)$ time.
- **1-Click Settlement & Ledger Tracking**: Pairwise net balance computation with 1-click debt settlement in Balance Dashboard and custom settlement forms in Expense Manager.
- **Type-Safe Audit Event Feed**: `ExpenseEventType` enum (`USER_CREATED`, `GROUP_CREATED`, `MEMBER_ADDED`, `EXPENSE_ADDED`, `SETTLEMENT`) logging chronological activity with Indian Standard Time (`Asia/Kolkata`) timestamps and balance snapshots.
- **Thread Safety**: Service-level `ReentrantLock` ensuring atomic multi-user ledger updates and `ConcurrentHashMap` repository.
- **Lombok Domain Models**: Clean `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor` entity models.

#### API Endpoints
- `POST /api/splitwise/users`
- `GET /api/splitwise/users`
- `GET /api/splitwise/users/{id}`
- `POST /api/splitwise/groups`
- `GET /api/splitwise/groups`
- `GET /api/splitwise/groups/{id}`
- `PUT /api/splitwise/groups/{groupId}/members/{userId}`
- `POST /api/splitwise/expenses`
- `GET /api/splitwise/groups/{groupId}/expenses`
- `GET /api/splitwise/users/{userId}/balances`
- `POST /api/splitwise/settle`
- `GET /api/splitwise/users/{userId}/transactions`
- `GET /api/splitwise/groups/{groupId}/simplified-debts`
- `GET /api/splitwise/events`
- `POST /api/splitwise/sim/reset`
- `POST /api/splitwise/sim/users`
- `POST /api/splitwise/sim/groups`
- `POST /api/splitwise/sim/expenses`
- `POST /api/splitwise/sim/settle`
- `GET /api/splitwise/sim/balances`
- `GET /api/splitwise/sim/events`
- `GET /api/splitwise/sim/groups/{groupId}/simplified-debts`

---

### 9. Elevator System

#### Key Features
- **SCAN Dispatch Strategy**: LOOK/SCAN distance + direction proximity penalty scoring with 3-tier tie-breaking.
- **State Machine & Capacity Limits**: Elevator states (`IDLE`, `MOVING_UP`, `MOVING_DOWN`, `DOOR_OPEN`, `MAINTENANCE`) with atomic capacity bounds.
- **5-Tab Visualizer**: Animated sliding doors, occupancy gauges, floor call buttons, and interactive simulation replay.

#### API Endpoints
- `GET /api/elevator/elevators`
- `POST /api/elevator/request`
- `POST /api/elevator/destination`
- `POST /api/elevator/maintenance`
- `POST /api/elevator/tick`
- `POST /api/elevator/sim/reset`
- `POST /api/elevator/sim/request`
- `POST /api/elevator/sim/step`

---

### 10. Library Management

#### Key Features
- **Multi-Copy Catalog Management**: Aggregates titles, ISBNs, and physical `BookCopy` assets with barcode tracking and rack locations.
- **Factory Pattern for Typed Members**: `MemberFactory` creates `STUDENT` (3 books / 14 days), `FACULTY` (10 books / 30 days), and `GENERAL` (5 books / 21 days) members with distinct `LoanPolicy` constraints.
- **Fine-Grained Concurrency**: Per-book `ReentrantLock` preventing last-copy race conditions, and per-member mutexes guarding quota oversubscription.
- **Strategy & Observer Patterns**: `FineStrategy` (`StandardFineStrategy`) calculating daily overdue fees, and `DueDateNotifier` dispatching automated reminder/overdue alerts via background sweeps.
- **Explicit Loan State Machine**: `ACTIVE` ➔ `RETURNED` / `OVERDUE` with idempotent return validation.

#### API Endpoints
- `GET /api/library/books`
- `GET /api/library/books/search?query=`
- `POST /api/library/books`
- `POST /api/library/books/{isbn}/copies`
- `GET /api/library/members`
- `POST /api/library/members`
- `POST /api/library/borrow`
- `POST /api/library/return/{loanId}`
- `POST /api/library/members/{memberId}/pay-fine`
- `GET /api/library/members/{memberId}/loans/active`
- `GET /api/library/members/{memberId}/notifications`
- `POST /api/library/sim/reset`
- `POST /api/library/sim/borrow`
- `POST /api/library/sim/return/{loanId}`
- `POST /api/library/sim/sweep`

---

### 11. Movie Ticket Booking (BookMyShow)

#### Key Features
- **Per-Seat Lock Granularity**: `ReentrantLock` per seat (`showId:seatId`) preventing global serialization.
- **Seat-Hold Lifecycle & TTL**: `AVAILABLE` ➔ `HELD` (5-minute TTL) ➔ `BOOKED` with automated background cleanup.
- **Deadlock Prevention**: Ascending seat ID lock acquisition ordering.
- **Strategy & Observer Patterns**: Dynamic pricing strategy and real-time seat availability observer.

#### API Endpoints
- `GET /api/movie-ticket/movies`
- `GET /api/movie-ticket/shows/{id}/seats`
- `POST /api/movie-ticket/shows/{id}/hold`
- `POST /api/movie-ticket/book`
- `POST /api/movie-ticket/cancel`

---

### 13. Airline Reservation

#### Key Features
- **Multi-Passenger Flight Booking**: Atomic reservation and booking of multiple seats paired to passenger details in a single transactional unit.
- **Deadlock-Free Multi-Seat Locking**: Per-seat `ReentrantLock` keyed `flightId:seatNumber` acquired in ascending alphabetical order to eliminate circular-wait deadlocks.
- **Seat Hold State Machine & TTL**: `AVAILABLE` ➔ `HELD` (5-minute TTL) ➔ `BOOKED` with automated background cleanup of stale holds.
- **Strategy Pattern for Pricing & Refunds**: Class-based pricing (`Economy`, `Business`, `First`) and `TieredCancellationRefundPolicy` (>24h full refund, 24h–2h partial 50%, <2h no refund).
- **Idempotent Payment Capture**: `PaymentProcessor` ensuring zero duplicate charges on retried bookings.

#### API Endpoints
- `GET /api/airline/flights`
- `GET /api/airline/flights/search`
- `GET /api/airline/flights/{flightId}/seats`
- `POST /api/airline/flights/{flightId}/hold`
- `POST /api/airline/bookings`
- `POST /api/airline/bookings/{bookingId}/cancel`
- `GET /api/airline/users/{userId}/bookings`
- `POST /api/airline/sim/reset`
- `POST /api/airline/sim/hold`
- `POST /api/airline/sim/book`
- `POST /api/airline/sim/cancel`
- `POST /api/airline/sim/expire`

---

### 14. Coffee Machine

#### Key Features
- **Decorator Pattern for Drink Customization**: Dynamically wrap base coffees with chained add-ons (`ExtraShotDecorator`, `ExtraMilkDecorator`, `WhippedCreamDecorator`, `CaramelSyrupDecorator`, `OatMilkDecorator`), computing cumulative prices and unwrapping aggregated multi-ingredient requirements.
- **Factory Pattern for Recipe Creation**: `CoffeeFactory` encapsulates recipe lookups (`Espresso`, `Latte`, `Cappuccino`, `Americano`, `Mocha`) and supports runtime registration of new handcrafted coffee formulas.
- **State Pattern Machine Lifecycle**: Hardware FSM transitions (`IDLE` ➔ `SELECTING` ➔ `PAYMENT_PENDING` ➔ `BREWING` ➔ `DISPENSED` ➔ `IDLE`), guarding operations against invalid invocations.
- **Deadlock-Free Multi-Ingredient Locking**: Orders requiring multiple hoppers acquire fine-grained per-ingredient `ReentrantLock`s in strict ascending enum order, eliminating circular wait under concurrent overlapping demands.
- **Telemetry & Low-Stock Alerts**: Continuous monitoring across 7 hoppers with low-stock warnings and isolated `/sim/*` educational test runner.

#### API Endpoints
- `GET /api/coffeemachine/menu`
- `GET /api/coffeemachine/status`
- `GET /api/coffeemachine/inventory`
- `GET /api/coffeemachine/orders`
- `POST /api/coffeemachine/order`
- `POST /api/coffeemachine/customize`
- `POST /api/coffeemachine/payment`
- `POST /api/coffeemachine/brew`
- `POST /api/coffeemachine/collect`
- `POST /api/coffeemachine/cancel`
- `POST /api/coffeemachine/refill`
- `POST /api/coffeemachine/sim/reset`
- `POST /api/coffeemachine/sim/select`
- `POST /api/coffeemachine/sim/customize`
- `POST /api/coffeemachine/sim/payment`
- `POST /api/coffeemachine/sim/brew`
- `POST /api/coffeemachine/sim/collect`
- `POST /api/coffeemachine/sim/cancel`
- `POST /api/coffeemachine/sim/refill`
- `POST /api/coffeemachine/sim/race`
- `GET /api/coffeemachine/sim/events`
- `GET /api/coffeemachine/sim/snapshot`

---

### 19. Online Shopping System (Shopping Cart)

#### Key Features
- **Command Pattern with Undo**: Cart commands (`AddItemCommand`, `RemoveItemCommand`, `UpdateQuantityCommand`) with single-step atomic Undo.
- **Multi-Strategy Payment**: Process checkout via UPI, Credit Card, Debit Card, or Wallet strategies.
- **Deadlock-Free Checkout**: Ascending `productId` lock ordering on fine-grained per-product `ReentrantLock`s.
- **Atomic Stock Protection**: CAS check-and-decrement preventing negative stock under high-concurrency race conditions.

#### API Endpoints
- `GET /api/shoppingcart/products`
- `GET /api/shoppingcart/cart/{userId}`
- `POST /api/shoppingcart/cart/{userId}/add`
- `POST /api/shoppingcart/cart/{userId}/undo`
- `POST /api/shoppingcart/checkout`
- `POST /api/shoppingcart/orders/{id}/cancel`
- `POST /api/shoppingcart/sim/reset`
- `POST /api/shoppingcart/sim/place-order`

---

### 21. Vending Machine

#### Key Features
- **State Pattern Lifecycle Management**: Encapsulates behavior into discrete state implementations (`IdleState`, `HasSelectionState`, `HasMoneyState`, `DispensingState`) preventing invalid hardware actions at the type level.
- **Chain of Responsibility (CoR) for Change Dispensing**: `ChangeDispenserChain` coordinates descending denomination handlers (`₹500` → `₹100` → `₹50` → `₹20` → `₹10` → `₹5` → `₹2` → `₹1`) with coin/note hopper availability bounds.
- **Dual-Path Operation**: Supports selecting product first then paying, or depositing cash first then choosing an item.
- **Atomic Coil Motor Dispense & Concurrency Protection**: `ReentrantLock` guarantees thread-safe inventory decrements and hopper change deduction.
- **Edge Case Exception Safety**: `OutOfStockException` (409), `InsufficientPaymentException` (402), `InsufficientChangeException` (409), `ProductNotFoundException` (404), and `InvalidStateException` (400) with automatic refund on failure.
- **Interactive 5-Tab React UI**: Hardware Console with 3x4 Matrix Showcase, Alphanumeric Keypad, Bill/Coin Acceptor, Admin Restock Drawer, 8-Step 2D Simulation Sandbox, Class Diagram, and Design Details.

#### API Endpoints
- `GET /api/vendingmachine/slots`
- `GET /api/vendingmachine/products`
- `GET /api/vendingmachine/status`
- `GET /api/vendingmachine/change-inventory`
- `GET /api/vendingmachine/transactions`
- `POST /api/vendingmachine/select`
- `POST /api/vendingmachine/insert-money`
- `POST /api/vendingmachine/dispense`
- `POST /api/vendingmachine/cancel`
- `POST /api/vendingmachine/restock`
- `POST /api/vendingmachine/refill-change`
- `POST /api/vendingmachine/sim/reset`
- `POST /api/vendingmachine/sim/select`
- `POST /api/vendingmachine/sim/insert-money`
- `POST /api/vendingmachine/sim/dispense`
- `POST /api/vendingmachine/sim/cancel`
- `POST /api/vendingmachine/sim/restock`
- `GET /api/vendingmachine/sim/events`
- `GET /api/vendingmachine/sim/snapshot`

---

### 25. LinkedIn

#### Key Features
- **Professional Graph & Canonical Pair Locking**: User profiles, connection requests (`PENDING`, `ACCEPTED`, `REJECTED`), and deadlock-free pair locking (`min(u1, u2) + "#" + max(u1, u2)`).
- **Strategy Pattern for Weighted Ranking**: `UserSearchRankingStrategy` (4-factor scoring: name, headline, skill overlap, network degree) and `JobSearchRankingStrategy` (title, skills, location, recency).
- **Observer Pattern for Event Dispatching**: `NotificationObserver` pipeline broadcasting in-app alerts and log records for connection requests, direct messages, and job applications.
- **Direct Messaging Guards**: Enforces 1st-degree `ACCEPTED` connection status prior to message delivery.
- **Interactive 6-Tab React UI**: My Profile & Network, Jobs & Applications, Messaging & Inboxes, 2D Sandbox Simulation, Class Diagram, and Design Details.

#### API Endpoints
- `GET /api/linkedin/users`
- `GET /api/linkedin/users/{id}/profile`
- `POST /api/linkedin/users/{id}/profile`
- `POST /api/linkedin/connections/request`
- `POST /api/linkedin/connections/accept`
- `POST /api/linkedin/messages`
- `GET /api/linkedin/messages/{u1}/{u2}`
- `GET /api/linkedin/jobs`
- `POST /api/linkedin/jobs`
- `POST /api/linkedin/jobs/{id}/apply`
- `GET /api/linkedin/search/users?query=`
- `GET /api/linkedin/search/jobs?query=`
- `POST /api/linkedin/sim/reset`
- `POST /api/linkedin/sim/connect`
- `POST /api/linkedin/sim/message`

---

### 27. Pub/Sub System (Message Broker)

#### Key Features
- **Dedicated Per-Subscriber Workers**: Independent `SubscriberWorker` threads with `ArrayBlockingQueue<Message>` guaranteeing strict FIFO delivery order per subscriber.
- **Non-Blocking Dispatch**: `Broker.publish()` enqueues and returns immediately without stalling publishers.
- **Backpressure Policy**: Drop-and-reject policy when a subscriber queue is full, emitting simulation alerts.
- **Lock-Free Iteration**: `CopyOnWriteArrayList` for subscriber registration.

#### API Endpoints
- `POST /api/pubsub/topics`
- `POST /api/pubsub/subscribe`
- `POST /api/pubsub/unsubscribe`
- `POST /api/pubsub/publish`
- `GET /api/pubsub/subscribers/{id}/messages`
- `POST /api/pubsub/sim/reset`
- `POST /api/pubsub/sim/publish`

---

### 28. Car Rental System

#### Key Features
- **Overlapping-Interval Reservation Locking**: `ReservationLockService` claims a per-vehicle fair `ReentrantLock` (via `computeIfAbsent`) and re-reads the vehicle's **entire reservation set** inside the lock, rejecting on any date-range overlap before committing — a genuinely different lock shape from a single free/busy flag, since the invariant spans a set of existing bookings, not one boolean.
- **Tiered Pricing Strategy + Factory**: `PricingStrategyFactory.forDuration(days)` resolves `StandardPricingStrategy` (1–2 days), `WeeklyDiscountPricingStrategy` (3–6 days, 10% off) or `LongRentalDiscountPricingStrategy` (7+ days, 20% off) — `CarRentalService` never branches on duration itself.
- **Reservation State Machine**: `ReservationStatus` declares its legal transitions in one table (`PENDING → CONFIRMED → ACTIVE → COMPLETED`, or `CANCELLED` from the first two) enforced through a single `transition()` gate, same idiom as Uber's `RideStatus`.
- **Vehicle Status Is a Fleet Gate, Not a Per-Date Flag**: `VehicleStatus` (`AVAILABLE`/`RENTED`/`MAINTENANCE`/`RETIRED`) only gates new reservations via `MAINTENANCE`/`RETIRED` — real per-date availability is always answered by scanning the reservation set, so one vehicle can legitimately carry many non-overlapping future reservations.
- **Late Fee & Refunds**: Returning after the booked end date adds a 1.5x-daily-rate late fee to the actual cost; cancelling a paid (`CONFIRMED`) reservation refunds the captured payment.
- **Isolated Simulation Sandbox**: `/api/car-rental/sim/*` backed by a second `CarRentalRepository` + `ReservationLockService` pair, so the interactive demo (including a live two-customer overlap race) never touches live fleet data.

#### API Endpoints
- `GET /api/car-rental/vehicles/available`
- `GET /api/car-rental/estimate`
- `POST /api/car-rental/reservations`
- `PUT /api/car-rental/reservations/{id}/confirm`
- `PUT /api/car-rental/reservations/{id}/pickup`
- `PUT /api/car-rental/reservations/{id}/return`
- `PUT /api/car-rental/reservations/{id}/cancel`
- `POST /api/car-rental/sim/reset`
- `POST /api/car-rental/sim/reservations`

---

### 32. Concert Ticket Booking

#### Key Features
- **Per-Seat Lock Granularity**: `ReentrantLock` per seat (`eventId:seatId`), adapted from the airline/movie-ticket `SeatLockManager` pattern, preventing global serialization across a venue's seat map.
- **PENDING-Booking Hold Lifecycle & TTL**: `selectSeats` creates a visible `PENDING` booking the moment seats are held (`AVAILABLE` ➔ `HELD`, 10-minute TTL) — not just a seat-level lock — so a hold-expiry sweep has a booking record to cancel, not just seats to release.
- **Deadlock Prevention**: Ascending seat-id lock acquisition ordering for multi-seat holds.
- **Strategy Pattern for Cancellation Refunds**: `CancellationPolicy` (`FullRefundPolicy` ≥7 days, `PartialRefundPolicy` 2–6 days at 50%, `NoRefundPolicy` <2 days) resolved by `CancellationPolicyFactory` from days-until-event.
- **Idempotent Payment Confirmation**: `X-Idempotency-Key` on `confirmBooking` returns the cached booking on retry instead of double-charging.

#### API Endpoints
- `GET /api/concert-ticket/events`
- `GET /api/concert-ticket/events/{eventId}/seats`
- `POST /api/concert-ticket/events/{eventId}/select`
- `POST /api/concert-ticket/bookings/{bookingId}/confirm`
- `POST /api/concert-ticket/bookings/{bookingId}/cancel`
- `GET /api/concert-ticket/users/{userId}/bookings`
- `POST /api/concert-ticket/sim/reset`
- `POST /api/concert-ticket/sim/select`
- `POST /api/concert-ticket/sim/confirm`
- `POST /api/concert-ticket/sim/cancel`
- `POST /api/concert-ticket/sim/expire`

---

### 35. Stock Brokerage Platform

#### Key Features
- **In-Memory Limit Order Book**: Price-Time Priority matching engine with dual `TreeMap` price levels (`bids` descending, `asks` ascending) and FIFO queues.
- **Strategy Pattern for Order Execution**: `MarketExecutionStrategy` (immediate liquidity sweep across multiple depth levels) and `LimitExecutionStrategy` (immediate match + resting in book).
- **Atomic Pre-Trade Balance Reservation**: Mutex-guarded cash reservation for Buy orders and share reservation for Sell orders, preventing over-commitment and race conditions.
- **Observer Pattern for Live Quotes**: Registered `StockPriceObserver` instances receive push updates on last-traded price and executed volume.
- **Per-Symbol Concurrency Serialization**: Dedicated per-symbol `ReentrantLock` ensuring atomic matching while allowing independent stock tickers to trade in parallel.

#### API Endpoints
- `GET /api/stockbroker/stocks`
- `GET /api/stockbroker/stocks/{symbol}`
- `GET /api/stockbroker/orderbook/{symbol}`
- `GET /api/stockbroker/accounts/{accountId}`
- `GET /api/stockbroker/accounts/{accountId}/orders`
- `POST /api/stockbroker/orders`
- `POST /api/stockbroker/orders/{orderId}/cancel`
- `GET /api/stockbroker/quotes`
- `POST /api/stockbroker/sim/reset`
- `POST /api/stockbroker/sim/order`
- `POST /api/stockbroker/sim/cancel`
- `GET /api/stockbroker/sim/snapshots`
- `GET /api/stockbroker/sim/events`

---

## Tech Stack

- **Backend**: Java 17, Spring Boot 3.2, Maven (Single Spring Boot JAR, Port 9090)
- **Frontend**: React 19, Vite 6, React Router 7 (Single SPA, Port 3000, route-level code splitting)
