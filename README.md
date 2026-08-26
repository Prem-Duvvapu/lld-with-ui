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
| 5 | [Tic Tac Toe](#5-tic-tac-toe) | 2-player game | State Machine, Exception Hierarchy, Undo History, Isolated Sim Engine |
| 6 | [Snake & Ladders](#6-snake--ladders) | Multiplayer board game | Dice Strategy, Per-Game Lock, Exact-Count Win Rule, Isolated Sim Engine |
| 7 | [ATM](#7-atm) | Banking ATM | State Machine, Denomination Strategy, ReentrantLock, Lockout |
| 8 | [Splitwise](#8-splitwise) | Expense sharing | Split Strategies (Equal/Percentage/Exact), Graph Debt Simplification |
| 9 | [Elevator](#9-elevator) | Elevator control | SCAN Scheduling Strategy, Proximity Scoring, ReentrantLock |
| 10 | [Library Management](#10-library-management) | Book Catalog & Loans | Strategy (fines), Factory (members), Observer (due date), Per-Book ReentrantLock |
| 11 | [Movie Ticket Booking](#11-movie-ticket-booking) | Cinema seats & shows | Per-Seat ReentrantLock, Hold TTL, Strategy, Observer |
| 12 | Hotel Management | Room reservation | State Machine, Strategy, Factory |
| 13 | [Airline Reservation](#13-airline-reservation) | Flight booking & seats | State Machine (holds/bookings), Strategy (pricing/refunds), Per-Seat ReentrantLock |
| 14 | [Coffee Machine](#14-coffee-machine) | Ingredient & brew engine | State Pattern, Factory (Recipes), Decorator (Customizations), Deadlock-Safe Multi-Ingredient Locking |
| 15 | [Digital Wallet](#15-digital-wallet) | Payment & ledger | Command Pattern, Per-Wallet ReentrantLock, Ascending Lock Ordering |
| 16 | Chess | 2-Player strategy game | Command, State, Strategy |
| 17 | [Ludo](#17-ludo) | Multiplayer board game | Token-Lifecycle State Machine, Dice Strategy, Exact-Count Home Entry, Per-Game Lock, Isolated Sim Engine |
| 18 | [Inventory Management](#18-inventory-management) | Stock & warehouse | Observer, Strategy + Factory (reorder policies), Per-Product ReentrantLock |
| 19 | [Shopping Cart](#19-online-shopping-system-shopping-cart) | E-commerce & checkout | Command (Undo), Strategy (Payment), Ascending Lock Ordering |
| 20 | [Minesweeper](#20-minesweeper) | Grid mine game | Strategy (mine placement), First-Click-Safe Policy, Recursive Flood-Fill, Per-Game Lock |
| 21 | [Vending Machine](#21-vending-machine) | State-based dispenser | State Pattern (Idle/Selection/Money/Dispensing), Chain of Responsibility Change Hopper |
| 22 | Logging Framework | Log sink engine | Chain of Responsibility, Singleton |
| 23 | Traffic Signal | Signal timing engine | State Pattern, Observer |
| 24 | [Task Management System](#24-task-management-system) | Task workflow | State Pattern, Strategy + Factory (board ordering), Per-Task ReentrantLock |
| 25 | [LinkedIn](#25-linkedin) | Professional network | Graph Model, Strategy (ranking), Observer (alerts), Pair Locking |
| 26 | [LRU Cache](#26-lru-cache) | In-memory cache | Strategy (LRU/LFU/FIFO eviction), Doubly Linked List + HashMap, Isolated Sim Engine |
| 27 | [Pub Sub System](#27-pubsub-system-message-broker) | Message broker | Observer, Dedicated Per-Subscriber FIFO Worker Threads |
| 28 | [Car Rental System](#28-car-rental-system) | Vehicle fleet & booking | Overlapping-Interval Per-Vehicle Lock, Strategy + Factory (tiered pricing), State Machine |
| 29 | [Online Auction System](#29-online-auction-system) | Bidding engine | Observer, Strategy + Factory (bid increment), Per-Auction ReentrantLock |
| 30 | Restaurant Management | Order & kitchen workflow | State Machine, Factory |
| 31 | [Social Network](#31-social-network) | Posts & feeds | Observer (feed fan-out), Canonical Pair Locking, Isolated Sim Engine |
| 32 | [Concert Ticket Booking](#32-concert-ticket-booking) | Event seats & reservation | Per-Seat ReentrantLock, Hold TTL, Strategy (refund policy) |
| 33 | [CricInfo](#33-cricinfo) | Live cricket scorecard | Observer Pattern (ball-by-ball fan-out), Live Scorecard Projection, Per-Match Lock |
| 34 | [Course Registration System](#34-course-registration-system) | Student enrollment | Facade, Repository, Per-Section ReentrantLock + FIFO Waitlist, Prerequisite & Schedule-Conflict Checks |
| 35 | [Stock Brokerage Platform](#35-stock-brokerage-platform) | Trading & portfolio | Order Book (Price-Time Priority), Strategy (Market/Limit), Observer Quotes |
| 36 | [Music Streaming Service](#36-music-streaming-service) | Audio catalog & playlists | Strategy (subscription tiers), Factory, Observer, Per-User ReentrantLock |
| 37 | FooBar Alternately | Multithreading concurrency | Two-Semaphore Strict Alternation, real backend trace replay |
| 38 | Zero Even Odd | Multithreading concurrency | Three-Semaphore Coordinated Handoff, real backend trace replay |
| 39 | Fizz Buzz Multithreaded | Multithreading concurrency | ReentrantLock + Condition (4-thread monitor), real backend trace replay |
| 40 | Building H2O | Multithreading concurrency | Semaphore-Bounded CyclicBarrier, real backend trace replay |
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
cd backend  && mvn test        # 881 tests across 91 classes
cd frontend && npx vitest run  # 286 tests across 3 files
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
- **2-Player Human vs Human**: a 3x3 board with turn-based X/O play — no AI opponent exists in this codebase.
- **Exact Win-Line Detection**: an O(N) row/column/diagonal scan returns the precise `[startRow, startCol, endRow, endCol]` winning line for the frontend to highlight, checked from an empty board opening through mid-game fork positions.
- **Typed Exception Contract**: `GameNotFoundException` (404), `InvalidMoveException` (400), `CellOccupiedException` (422), `NotYourTurnException` (409), `GameOverException` (409) — replacing an earlier ad hoc `IllegalArgumentException`/`IllegalStateException` + manual controller `try/catch`.
- **Move History & Undo**: step-by-step move history log with atomic Undo move support.
- **Per-Game Locking + Isolated Simulation Sandbox**: a `ReentrantLock` per game id, and `/api/tictactoe/sim/*` backed by a second in-memory repository so the demo tab can never corrupt a real match.

#### API Endpoints
- `POST /api/tictactoe/games`
- `GET /api/tictactoe/games/{id}`
- `POST /api/tictactoe/games/{id}/move`
- `POST /api/tictactoe/games/{id}/undo`
- `POST /api/tictactoe/games/{id}/reset`
- `POST /api/tictactoe/sim/reset`, `GET /api/tictactoe/sim/game`, `GET /api/tictactoe/sim/log`, `POST /api/tictactoe/sim/move`, `POST /api/tictactoe/sim/undo`

---

### 6. Snake & Ladders

#### Key Features
- **Multiplayer Board**: 100-cell board supporting 2-4 players (validated — 5+ players previously crashed with an unhandled 500; see RCA-014), 6 snakes and 11 ladders, turn order cycling correctly for every player count.
- **Dice as a Strategy**: `DiceRoller` — `RandomDiceRoller` in production, `FixedDiceRoller` replaying a pinned sequence in tests, the only way exact-landing/snake/ladder resolution can be asserted deterministically.
- **Exact-Count Win Rule**: landing exactly on cell 100 wins; overshooting forfeits the roll and the player stays in place.
- **Typed Exception Contract**: `GameNotFoundException` (404), `InvalidPlayerCountException` (400), `GameAlreadyFinishedException` (409).
- **Per-Game Locking + Isolated Simulation Sandbox**: a `ReentrantLock` per game id (the module previously had no locking at all around dice rolls), and `/api/snakeladders/sim/*` backed by a second in-memory repository.

#### API Endpoints
- `POST /api/snakeladders/games`
- `GET /api/snakeladders/games/{id}`
- `POST /api/snakeladders/games/{id}/roll`
- `POST /api/snakeladders/sim/reset`, `GET /api/snakeladders/sim/game`, `GET /api/snakeladders/sim/log`, `POST /api/snakeladders/sim/roll`

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

### 18. Inventory Management

#### Key Features
- **Observer Pattern**: `StockAlertNotifier` (Subject) fans every `StockAlert` out to independent observers — `InAppStockAlertObserver` (the queryable feed behind `GET /alerts`) and `LoggingStockAlertObserver` — neither aware the other exists.
- **Strategy + Factory (Reorder Policies)**: `ReorderStrategyFactory` resolves `MIN_RESTOCK` (exact shortfall to reorder level), `EOQ` (classic Harris economic-order-quantity lot size), or `URGENT_BUFFER` (5× reorder level on a stock-out, 3× otherwise) via an `EnumMap` — `InventoryService` never branches on the policy itself.
- **Per-Product ReentrantLock with Crossing Detection**: `updateStock`/`reorder` take a fair per-product lock (`computeIfAbsent`, same idiom as `DriverAssignmentService`) around the stock arithmetic AND the low-stock/out-of-stock/restocked crossing check, so two concurrent sales of the last unit can never both succeed and a crossing alert fires exactly once, not on every subsequent mutation while already in that state.
- **Shared Live/Sim Mutation Path**: `updateStock`, `transferStock`, `simSell`, `simRestock`, `simTransfer` and `simRace` all funnel through one private `doUpdateStock()`, so validation, arithmetic and alerting can never drift between the live and sandboxed paths.
- **Isolated Simulation Sandbox with a Live Race**: `/api/inventory/sim/*` runs against a second repository/notifier pair; `simRace` fires N concurrent single-unit purchases at one product via a `CountDownLatch` and returns exactly how many succeeded, how many were rejected, and the final stock.

#### API Endpoints
- `GET /api/inventory/products`
- `POST /api/inventory/products`
- `POST /api/inventory/products/{id}/stock`
- `GET /api/inventory/products/low-stock`
- `POST /api/inventory/products/{id}/reorder`
- `POST /api/inventory/products/{id}/transfer`
- `GET /api/inventory/products/{id}/movements`
- `GET /api/inventory/suppliers`
- `GET /api/inventory/alerts`
- `GET /api/inventory/events`
- `POST /api/inventory/sim/reset`
- `GET /api/inventory/sim/state`
- `POST /api/inventory/sim/sell`
- `POST /api/inventory/sim/restock`
- `POST /api/inventory/sim/transfer`
- `POST /api/inventory/sim/reorder`
- `POST /api/inventory/sim/race`
- `GET /api/inventory/sim/alerts`
- `GET /api/inventory/sim/events`

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

### 24. Task Management System

#### Key Features
- **State Pattern**: `com.lld.taskmanagement.state` — one singleton class per `TaskStatus` (`TodoState`, `InProgressState`, `ReviewState`, `BlockedState`, `DoneState`, `CancelledState`), each declaring the exact `Set<TaskStatus>` it may legally move to next. `Task#transitionTo()` is the one enforcement point; an illegal jump (e.g. `TODO` straight to `DONE`) throws `IllegalTaskTransitionException` (409) instead of being silently applied.
- **Strategy + Factory (Board Ordering)**: `TaskOrderingStrategyFactory` resolves `FIFO_PRIORITY` (priority weight, ties by creation order), `DUE_DATE_FIRST` (earliest deadline first), or `WEIGHTED_SCORE` (priority weight plus a deterministic urgency bonus) via an `EnumMap` — `TaskService` never branches on the policy itself.
- **Per-Task ReentrantLock guarding two real races**: a fair per-task lock re-validates the transition (or the claim-if-unassigned check) against the CURRENT state inside the lock, so two actors racing to move the same task to two different terminal statuses — or racing to claim the same unassigned task — can never both win.
- **Isolated Simulation Sandbox with Two Live Races**: `/api/tasks/sim/*` runs against a second repository seeded with tasks walked through the real state machine; `simClaimRace` and `simTransitionRace` fire concurrent callers via a `CountDownLatch` and return exactly who won and who was rejected.

#### API Endpoints
- `GET /api/tasks/boards`
- `POST /api/tasks/boards`
- `GET /api/tasks/boards/{boardId}`
- `GET /api/tasks/boards/{boardId}/tasks`
- `GET /api/tasks/boards/{boardId}/ordered`
- `POST /api/tasks/boards/{boardId}/tasks`
- `GET /api/tasks/{id}`
- `PUT /api/tasks/{id}/status`
- `PUT /api/tasks/{id}/priority`
- `PUT /api/tasks/{id}/assignee`
- `POST /api/tasks/{id}/claim`
- `DELETE /api/tasks/{id}`
- `POST /api/tasks/sim/reset`
- `GET /api/tasks/sim/state`
- `POST /api/tasks/sim/move`
- `POST /api/tasks/sim/claim`
- `POST /api/tasks/sim/order`
- `POST /api/tasks/sim/claim-race`
- `POST /api/tasks/sim/transition-race`
- `GET /api/tasks/sim/events`

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

### 29. Online Auction System

#### Key Features
- **Per-Auction ReentrantLock with Check-Then-Act Fix**: `AuctionService#doPlaceBid` takes a fair per-auction lock (`computeIfAbsent`, same idiom as `InventoryService.productLocks`) and re-fetches the auction and re-checks the current highest bid **inside** the lock, so two bidders offering the identical amount at the identical instant can never both be recorded as the leading bid — exactly one wins, the rest get `BidTooLowException`.
- **Observer Pattern**: `AuctionNotifier` fans every `OutbidEvent` out to independent observers — `InAppAuctionObserver` (the queryable feed behind `GET /notifications`) and `LoggingAuctionObserver` — neither aware the other exists, and only fired when a bid actually supersedes a previous leading bidder.
- **Strategy + Factory (Bid Increment)**: `BidIncrementStrategyFactory` resolves `FIXED` (flat currency step) or `PERCENTAGE` (percent of the current bid, rounded to the cent) via an `EnumMap` — `AuctionService` never branches on the policy itself.
- **Time-Derived Lifecycle Guards**: a bid before an auction's start time throws `InvalidAuctionWindowException`; a bid after its end time or on an already-closed auction throws `AuctionClosedException` — both derived from wall-clock time against `startTime`/`endTime` directly, not from a background-scheduler-maintained status flag that could go stale.
- **Isolated Simulation Sandbox with a Live Race**: `/api/auction/sim/*` runs against a second repository/notifier pair, seeded with 3 bidders and 4 auctions across both increment policies and every lifecycle state; `simRace` fires N concurrent identical-amount bids via a `CountDownLatch` and returns exactly how many succeeded, how many were rejected, and the winning bidder.

#### API Endpoints
- `GET /api/auction/auctions`
- `POST /api/auction/auctions`
- `GET /api/auction/auctions/{id}`
- `POST /api/auction/auctions/{id}/close`
- `GET /api/auction/auctions/{id}/bids`
- `POST /api/auction/bidders`
- `GET /api/auction/bidders`
- `POST /api/auction/bids`
- `GET /api/auction/notifications`
- `POST /api/auction/sim/reset`
- `GET /api/auction/sim/snapshot`
- `POST /api/auction/sim/bid`
- `POST /api/auction/sim/close`
- `POST /api/auction/sim/race`
- `GET /api/auction/sim/events`

---

### 31. Social Network

#### Key Features
- **Observer Pattern for Feed Fan-Out**: `FeedNotifier` (Subject) fans a `FeedEvent` out to independent observers on every `createPost` — `InAppFeedObserver` (queryable log behind `GET /api/social/feed-events`, bounded to 100) and `LoggingFeedObserver` (server log) — neither aware the other exists, mirroring `inventory.observer.StockAlertNotifier`.
- **Canonical Pair Locking for Friend Requests**: a `ConcurrentHashMap<String, ReentrantLock>` keyed by `min(userId1, userId2) + "#" + max(userId1, userId2)` (the `LinkedInService` idiom, adapted to `long` ids) serializes `sendFriendRequest`/`respondToRequest` between the same pair regardless of call direction, so two concurrent sends or two concurrent accepts on the same pair can never both succeed.
- **Typed Exception Hierarchy**: `SocialException` (abstract) with `UserNotFoundException`/`PostNotFoundException`/`FriendRequestNotFoundException` (404), `AlreadyFriendsException`/`DuplicateFriendRequestException`/`RequestAlreadyRespondedException` (409), `InvalidSocialActionException` (400).
- **Isolated Simulation Sandbox with a Live Pair-Lock Race**: `/api/social/sim/*` runs against a second repository/notifier pair seeded with 3 demo users; `simRaceFriendRequests` fires N concurrent friend-request attempts (alternating direction) at one pair via a `CountDownLatch` and returns exactly how many won and how many were rejected.

#### API Endpoints
- `POST /api/social/users`
- `GET /api/social/users`
- `GET /api/social/users/{id}`
- `POST /api/social/friends/request`
- `PUT /api/social/friends/respond/{requestId}`
- `GET /api/social/friends/{userId}`
- `GET /api/social/requests/{userId}`
- `POST /api/social/posts`
- `GET /api/social/feed/{userId}`
- `GET /api/social/posts`
- `GET /api/social/feed-events`
- `POST /api/social/posts/{postId}/like`
- `POST /api/social/posts/{postId}/comment`
- `POST /api/social/sim/reset`
- `POST /api/social/sim/users`
- `POST /api/social/sim/posts`
- `POST /api/social/sim/friends/request`
- `POST /api/social/sim/friends/respond/{requestId}`
- `POST /api/social/sim/posts/{postId}/like`
- `POST /api/social/sim/posts/{postId}/comment`
- `POST /api/social/sim/race`
- `GET /api/social/sim/events`
- `GET /api/social/sim/snapshot`

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

### 33. CricInfo

#### Key Features
- **Observer Pattern, Ball-by-Ball**: `MatchPublisher` (Subject) fans every `BallEvent` out to four independent observers via a `CopyOnWriteArrayList<BallEventObserver>` — `ScorecardProjectionObserver` folds the ball into the innings' running totals and rebuilds the live scorecard, `PlayerCareerStatsObserver` updates each player's career aggregates, `CommentaryObserver` derives ball-by-ball text, and `BallEventAuditObserver` writes the audit/telemetry log — none aware the others exist.
- **Live Scorecard Projection**: `Scorecard` is a read-model folded entirely from the raw `Innings.balls` event stream, not re-derived by the client — clients poll `GET /matches/{id}/scorecard` instead of replaying deliveries themselves.
- **Atomic Per-Match Ball Recording**: `BallRecordingEngine` holds a per-match `ReentrantLock` (looked up by `matchId`, same shape as zomato's per-agent lock) around numbering the ball, appending it, and synchronously publishing to every observer — so two ball events racing for the same match can never interleave into a lost or double-counted run. Verified with a concurrency test comparing N concurrent deliveries against a strictly sequential reference run.
- **Dynamic Subscribe/Unsubscribe**: Non-core observers (Commentary, PlayerCareerStats, BallAudit) can be unsubscribed and resubscribed from the publisher at runtime via `PUT /observers/{name}` — demonstrated live in the simulation tab, which mutes and un-mutes commentary mid-innings.
- **Real Cricket State Machine**: `MatchStatus` (`UPCOMING → LIVE → INNINGS_BREAK → LIVE → COMPLETED`, or `ABANDONED`) gates every mutator through one `transition()` method; strike rotation on odd runs, over-completion, the "no consecutive overs" rule, and all-out/overs-exhausted innings completion are all modeled explicitly.

#### API Endpoints
- `GET /api/cricinfo/teams`, `GET /api/cricinfo/matches`
- `POST /api/cricinfo/matches`
- `PUT /api/cricinfo/matches/{id}/toss`
- `PUT /api/cricinfo/matches/{id}/start`
- `POST /api/cricinfo/matches/{id}/balls`
- `PUT /api/cricinfo/matches/{id}/next-innings`
- `GET /api/cricinfo/matches/{id}/scorecard`
- `GET /api/cricinfo/matches/{id}/commentary`
- `GET /api/cricinfo/observers`, `PUT /api/cricinfo/observers/{name}`
- `POST /api/cricinfo/sim/reset`
- `POST /api/cricinfo/sim/bowl`
- `GET /api/cricinfo/sim/telemetry`

---

### 34. Course Registration System

#### Key Features
- **Per-Section Capacity Lock + FIFO Waitlist**: `SectionCapacityManager` adapts the airline/car-rental per-entity `ReentrantLock` pattern to a capacity *counter* plus a `Deque<String>` waitlist instead of a single seat flag — `register()` re-checks `enrolledCount < capacity` inside the lock and enrolls-or-waitlists atomically, so N students racing for the last seat always yield exactly one ENROLLED and the rest WAITLISTED (never rejected outright).
- **Drop Promotes Under the Same Lock**: dropping a confirmed registration releases the seat and promotes the FIFO-head waitlisted student inside the *same* lock acquisition as the drop — a concurrent new registration for the freed seat can never win ahead of an already-queued student.
- **Prerequisite Checking**: registration is rejected with the specific missing course code(s) unless every prerequisite in `Course.prerequisiteCourseCodes` is in the student's `completedCourseCodes`.
- **Schedule-Conflict Detection**: `TimeSlot.conflictsWith()` rejects registration if the target section's weekly meeting time overlaps any section the student is currently `ENROLLED` in — day-set intersection AND half-open time-interval overlap, both required.
- **Isolated Simulation Sandbox**: `/api/course-registration/sim/*` backed by a second repository + lock-manager pair, including a `simRace` endpoint that fires N concurrent `register()` calls at one section via a `CountDownLatch` so the race is visible live in the UI, not just in a JUnit test.

#### API Endpoints
- `GET /api/course-registration/courses`
- `GET /api/course-registration/courses/{courseId}/sections`
- `GET /api/course-registration/students/{studentId}/registrations`
- `POST /api/course-registration/register`
- `POST /api/course-registration/drop`
- `POST /api/course-registration/sim/reset`
- `POST /api/course-registration/sim/race`
- `POST /api/course-registration/sim/register`
- `POST /api/course-registration/sim/drop`

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

### 36. Music Streaming Service

#### Key Features
- **Strategy + Factory for Subscription Tiers**: `SubscriptionStrategy` interface — `FreeSubscriptionStrategy` (1 concurrent stream, ads, 6 skips/hour, no downloads, 128kbps), `PremiumSubscriptionStrategy` (2 streams, ad-free, unlimited skips, downloads, lossless FLAC), `FamilySubscriptionStrategy` (6 streams, ad-free, downloads, 320kbps) — resolved by `SubscriptionStrategyFactory` via an `EnumMap`, the same shape as Splitwise's `SplitStrategyFactory`.
- **Concurrent-Stream Limit (Per-User ReentrantLock)**: `PlaybackService.startStream` guards the check-then-act race in "count my account's active sessions, then start a new one if under the plan's limit" with a `ReentrantLock` keyed per `userId`, so unrelated accounts stream fully in parallel while one account's device cap is enforced atomically.
- **Observer Pattern for Playback Events**: `PlaybackEventListener` is notified whenever a stream starts — `ListeningHistoryListener` records the play, `PlayCountListener` bumps the song's global play count — without `PlaybackService` knowing either exists.
- **Genre-Affinity Recommendations**: ranks unheard songs by the genres in a user's liked songs and listening history, falling back to global top plays for a new user.

#### API Endpoints
- `GET /api/music-streaming/songs`
- `GET /api/music-streaming/artists`
- `GET /api/music-streaming/albums`
- `GET /api/music-streaming/search`
- `GET /api/music-streaming/users/{userId}`
- `POST /api/music-streaming/users/{userId}/subscription`
- `GET /api/music-streaming/users/{userId}/recommendations`
- `POST /api/music-streaming/users/{userId}/playlists`
- `POST /api/music-streaming/playlists/{playlistId}/songs`
- `POST /api/music-streaming/playback/start`
- `POST /api/music-streaming/playback/{sessionId}/skip`
- `POST /api/music-streaming/users/{userId}/download/{songId}`
- `POST /api/music-streaming/sim/reset`
- `POST /api/music-streaming/sim/race`
- `GET /api/music-streaming/sim/events`

---

### 15. Digital Wallet

#### Key Features
- **Command Pattern**: Every credit, debit and transfer is a `WalletCommand` (`CreditCommand`, `DebitCommand`, `TransferCommand`) — each owns its own validation and locking, and `WalletService`'s command log of executed commands *is* the wallet's operational history.
- **Deadlock-Free Two-Account Transfer Locking**: no global lock — one `ReentrantLock` per wallet. `TransferCommand` always locks `min(fromId, toId)` before `max(fromId, toId)`, regardless of transfer direction, so two opposite-direction transfers racing the same wallet pair can never deadlock.
- **Typed Exception Hierarchy**: `WalletException` (abstract) with `WalletNotFoundException` (404), `InsufficientBalanceException` (409), `InvalidAmountException` (400), `SelfTransferException` (400).
- **Isolated Simulation Sandbox with a Live Race**: `/api/wallet/sim/*` runs against a second `WalletRepository`; `simRace` fires N concurrent alternating-direction transfers between two wallets via a `CountDownLatch` and reports the combined balance conserved exactly before and after.

#### API Endpoints
- `POST /api/wallet/create`
- `GET /api/wallet`
- `GET /api/wallet/{id}`
- `GET /api/wallet/{id}/balance`
- `POST /api/wallet/{id}/add-funds`
- `POST /api/wallet/{id}/withdraw`
- `POST /api/wallet/send`
- `GET /api/wallet/{id}/transactions`
- `GET /api/wallet/command-log`
- `POST /api/wallet/sim/reset`
- `GET /api/wallet/sim/state`
- `POST /api/wallet/sim/credit`
- `POST /api/wallet/sim/debit`
- `POST /api/wallet/sim/transfer`
- `POST /api/wallet/sim/race`
- `GET /api/wallet/sim/events`

---

### 16. Chess

#### Key Features
- **Strategy Pattern for Move Legality**: one `PieceMoveStrategy` per piece type (Pawn, Rook, Knight, Bishop, Queen, King), resolved by `PieceMoveStrategyFactory` via an `EnumMap` — adding a piece type is a new `@Component`, not a new `switch` arm.
- **Command Pattern for Move Application**: `ApplyMoveCommand` applies an already-validated move (board write, castling's rook hop, en passant's off-square capture, promotion's piece swap) as a reversible unit with a working `undo()`, decoupled from the legality checks.
- **State Machine for Game Status**: `GameStatus` (`ACTIVE`/`CHECK`/`CHECKMATE`/`STALEMATE`/`DRAW`/`RESIGNED`) declares its legal transitions in a `Map<GameStatus, Set<GameStatus>>` with `isTerminal()`, the same shape as `uber.model.RideStatus`.
- **Full Rule Coverage**: pins (a shape-legal move that exposes the mover's own king throws a distinct `MoveIntoCheckException`), castling (kingside/queenside with every illegality condition — moved king/rook, blocked squares, in check, passing through or landing on an attacked square), en passant (with correct one-move expiry), and pawn promotion (defaulting to queen, or a caller-chosen piece).
- **Per-Game Locking**: a `ReentrantLock` per game id serializes concurrent move requests for the *same* game while unrelated games proceed fully in parallel.
- **Isolated Simulation Sandbox**: `/api/chess/sim/*` backed by a second `ChessRepository`, playing a scripted Scholar's Mate against a sandbox game that can never touch a real one.

#### API Endpoints
- `POST /api/chess/games`
- `GET /api/chess/games/{id}`
- `POST /api/chess/games/{id}/move`
- `GET /api/chess/games/{id}/valid-moves`
- `POST /api/chess/games/{id}/resign`
- `POST /api/chess/sim/reset`
- `GET /api/chess/sim/game`
- `GET /api/chess/sim/log`
- `POST /api/chess/sim/move`

---

### 17. Ludo

#### Key Features
- **Token-Lifecycle State Machine**: `com.lld.ludo.state` — `HomeState`/`ActiveState`/`FinishedState`, each declaring the exact set of statuses it may move to next. `HOME -> ACTIVE` only on a roll of exactly 6, `ACTIVE -> HOME` on capture, `ACTIVE -> FINISHED` on an exact-count landing; `FINISHED` is terminal. `Token#transitionTo` is the single enforcement point — an illegal jump throws `InvalidMoveException` and leaves state unchanged.
- **Dice as a Strategy**: `DiceRoller` — `RandomDiceRoller` in production, `FixedDiceRoller` replaying a pinned sequence in tests — the only way "roll a 6 to leave home" and exact-count home entry can be asserted deterministically.
- **Exact-Count Home Entry**: a token needs the precise remaining roll to reach its home cell; an overshoot is rejected outright and the token stays exactly where it was (see RCA-020 for the overshoot-wraps-the-board bug this closed).
- **Captures & Safe Squares**: landing on a non-safe square held by an opponent's token sends it back HOME; the 4 start squares plus 4 star squares (8 total) are immune to capture.
- **Typed Exception Contract**: `GameNotFoundException` (404), `InvalidMoveException`/`InvalidPlayerCountException` (400), `NotYourTurnException`/`GameOverException` (409).
- **Per-Game Locking + Isolated Simulation Sandbox**: a `ReentrantLock` per game id (replacing a single module-wide lock), the die rolled inside that lock so a pending roll can never be double-spent, and `/api/ludo/sim/*` on a fixed 4-player sandbox backed by a second in-memory repository.

#### API Endpoints
- `POST /api/ludo/games`
- `GET /api/ludo/games/{id}`
- `POST /api/ludo/games/{id}/roll`
- `POST /api/ludo/games/{id}/move`
- `POST /api/ludo/sim/reset`, `GET /api/ludo/sim/game`, `GET /api/ludo/sim/log`, `POST /api/ludo/sim/roll`, `POST /api/ludo/sim/move`

---

### 20. Minesweeper

#### Key Features
- **First-Click-Safe Policy**: mines are placed lazily, on the first reveal, excluding only the clicked cell — a player's opening click can never lose the game. This did not exist before; mines used to be placed at game-creation time.
- **Mine Placement as a Strategy**: `MinePlacer` — `RandomMinePlacer` in production, `FixedMinePlacer` with an explicit layout in tests, the only way flood-fill shape, win/loss, and the first-click guarantee can be asserted deterministically.
- **Recursive Flood-Fill**: a zero-adjacency reveal cascades through every connected zero-adjacency cell and the numbered cells bordering them, without cascading past a numbered cell; bounds are checked before every array access.
- **Typed Exception Contract**: `GameNotFoundException` (404), `GameOverException` (409), `InvalidCellException` (400 — an out-of-bounds reveal/flag previously threw a bare, unhandled `ArrayIndexOutOfBoundsException`; see RCA-016), `InvalidBoardConfigException` (400 — a mine count at or above the cell count previously spun the placement loop forever, an unbounded CPU-pinning hang; see RCA-015).
- **Per-Game Locking + Isolated Simulation Sandbox**: a `ReentrantLock` per game id (replacing a single module-wide lock that serialized every unrelated game), and `/api/minesweeper/sim/*` on a fixed 5x5/3-mine board backed by a second in-memory repository.

#### API Endpoints
- `POST /api/minesweeper/games`
- `GET /api/minesweeper/games/{id}`
- `POST /api/minesweeper/games/{id}/reveal`
- `POST /api/minesweeper/games/{id}/flag`
- `POST /api/minesweeper/sim/reset`, `GET /api/minesweeper/sim/game`, `GET /api/minesweeper/sim/log`, `POST /api/minesweeper/sim/reveal`, `POST /api/minesweeper/sim/flag`

---

### 26. LRU Cache

#### Key Features
- **Strategy Pattern for Eviction**: `EvictionPolicy<K,V>` — `LRUEvictionPolicy` (sentinel head/tail doubly-linked list), `LFUEvictionPolicy` (access-count ranking), `FIFOEvictionPolicy` (strict insertion order) — swappable at runtime via `setPolicy()`, which replays every current entry into the newly-active policy.
- **Validated Capacity**: `InvalidCapacityException` (400) — the constructor and `setCapacity()` previously silently accepted (and ignored) a non-positive capacity; both now reject it with a real error instead of a stale 200.
- **Real-Time Telemetry**: hit/miss/eviction counters, hit rate %, and a rolling 50-entry operation log powering the Telemetry and Logs tabs.
- **Isolated Simulation Sandbox**: `/api/lrucache/sim/*` runs against a fully independent second `LruCache` instance, so the interactive "2D Memory Rack" demo can never perturb the primary cache's telemetry — already correctly wired before this pass; verified, not rebuilt.
- **Latch-Based Concurrency Proof**: N threads inserting distinct keys settle at exactly capacity and never above it; a mixed GET/PUT storm on a shared key space never returns a corrupted value; concurrent `remove()` of the same key is linearizable.

#### API Endpoints
- `GET /api/lrucache/snapshot`, `GET /api/lrucache/stats`
- `GET /api/lrucache/get/{key}`, `POST /api/lrucache/put`, `DELETE /api/lrucache/remove/{key}`, `POST /api/lrucache/clear`
- `POST /api/lrucache/capacity`, `POST /api/lrucache/policy`, `POST /api/lrucache/batch-simulate`
- `GET /api/lrucache/sim/snapshot`, `GET /api/lrucache/sim/get/{key}`, `POST /api/lrucache/sim/put`, `DELETE /api/lrucache/sim/remove/{key}`, `POST /api/lrucache/sim/clear`, `POST /api/lrucache/sim/capacity`, `POST /api/lrucache/sim/policy`, `POST /api/lrucache/sim/batch-simulate`

---

## Tech Stack

- **Backend**: Java 17, Spring Boot 3.2, Maven (Single Spring Boot JAR, Port 9090)
- **Frontend**: React 19, Vite 6, React Router 7 (Single SPA, Port 3000, route-level code splitting)
