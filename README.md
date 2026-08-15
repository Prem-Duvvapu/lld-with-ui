# Low-Level Design with UI

SDE-2 interview preparation portfolio (2+ years experience). **45 LLD projects** in a **single unified backend + frontend** architecture — Java 17 Spring Boot backend + React 19 / Vite frontend.

---

## Projects Overview

| # | Project | Domain | Key Design Patterns & Features |
|---|---------|--------|--------------------------------|
| 1 | [Parking Lot](#1-parking-lot) | Multi-level parking | Singleton, Strategy (pricing/spot), Factory, ReentrantLock |
| 2 | [Zomato](#2-zomato) | Food delivery | State Machine, Strategy (payment), Observer, OTP Handoff |
| 3 | [Uber](#3-uber) | Ride-hailing | State Machine, Strategy (pricing), Haversine Distance, OTP |
| 4 | [Stack Overflow](#4-stack-overflow) | Q&A platform | Strategy (reputation), Factory, Tag Search |
| 5 | [Tic Tac Toe](#5-tic-tac-toe) | 2-player game | State Machine, Minimax AI Strategy, Undo History |
| 6 | [Snake & Ladders](#6-snake--ladders) | Multiplayer board game | State Machine, Board & Snakes/Ladders Mapping |
| 7 | [ATM](#7-atm) | Banking ATM | State Machine, Denomination Strategy, ReentrantLock, Lockout |
| 8 | [Splitwise](#8-splitwise) | Expense sharing | Split Strategies (Equal/Percentage/Exact), Graph Debt Simplification |
| 9 | [Elevator](#9-elevator) | Elevator control | SCAN Scheduling Strategy, Proximity Scoring, ReentrantLock |
| 10 | [Library Management](#10-library-management) | Book Catalog & Loans | Strategy (fines), Factory (members), Observer (due date), Per-Book ReentrantLock |
| 11 | [Movie Ticket Booking](#11-movie-ticket-booking) | Cinema seats & shows | Per-Seat ReentrantLock, Hold TTL, Strategy, Observer |
| 12 | Hotel Management | Room reservation | State Machine, Strategy, Factory |
| 13 | [Airline Reservation](#13-airline-reservation) | Flight booking & seats | State Machine (holds/bookings), Strategy (pricing/refunds), Per-Seat ReentrantLock |
| 14 | Coffee Machine | Ingredient & brew engine | State Pattern, Factory, Decorator |
| 15 | Digital Wallet | Payment & ledger | Command Pattern, Transactional Lock |
| 16 | Chess | 2-Player strategy game | Command, State, Strategy |
| 17 | Ludo | Multiplayer board game | State Machine, Game Loop |
| 18 | Inventory Management | Stock & warehouse | Observer, Strategy |
| 19 | [Shopping Cart](#19-online-shopping-system-shopping-cart) | E-commerce & checkout | Command (Undo), Strategy (Payment), Ascending Lock Ordering |
| 20 | Minesweeper | Grid mine game | Recursion, Game Loop |
| 21 | Vending Machine | State-based dispenser | State Pattern, Chain of Responsibility |
| 22 | Logging Framework | Log sink engine | Chain of Responsibility, Singleton |
| 23 | Traffic Signal | Signal timing engine | State Pattern, Observer |
| 24 | Task Management System | Task workflow | State Pattern, Strategy |
| 25 | LinkedIn | Professional network | Graph Model, Observer |
| 26 | LRU Cache | In-memory cache | Doubly Linked List + HashMap |
| 27 | [Pub Sub System](#27-pubsub-system-message-broker) | Message broker | Observer, Dedicated Per-Subscriber FIFO Worker Threads |
| 28 | Car Rental System | Vehicle fleet & booking | State Machine, Strategy |
| 29 | Online Auction System | Bidding engine | Observer, Strategy |
| 30 | Restaurant Management | Order & kitchen workflow | State Machine, Factory |
| 31 | Social Network | Posts & feeds | Graph Model, Observer |
| 32 | Concert Ticket Booking | Event seats & reservation | Concurrency Lock, State Machine |
| 33 | CricInfo | Live cricket scorecard | Observer Pattern, Event Listener |
| 34 | Course Registration System | Student enrollment | Strategy, Observer |
| 35 | Stock Brokerage Platform | Trading & portfolio | Strategy, Observer, Order Book |
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
├── backend/              ← Spring Boot App (Port 9090)
│   └── src/main/java/com/lld/
│       ├── atm/           ← Banking ATM Module
│       ├── elevator/      ← Elevator Control Module
│       ├── movieticket/   ← BookMyShow Movie Ticket Module
│       ├── parkinglot/    ← Parking Lot Module
│       ├── pubsub/        ← Pub/Sub Message Broker Module
│       ├── shoppingcart/  ← Online Shopping Cart Module
│       ├── splitwise/     ← Splitwise Expense Module
│       ├── tictactoe/     ← Tic Tac Toe Arcade Module
│       ├── uber/          ← Cab Booking Module
│       ├── zomato/        ← Food Delivery Module
│       └── config/        ← CORS & Web Configuration
├── frontend/              ← React 19 + Vite SPA (Port 5173)
│   ├── src/
│   │   ├── components/    ← Reusable UI (ClassDiagram, DesignDetails, ThemeToggle)
│   │   ├── data/          ← Domain diagrams (classDiagrams.js, designDetails.js)
│   │   └── lld/           ← Modular LLD UI views
│   └── public/
└── README.md
```

---

## Quick Start

```bash
# Terminal 1 — Start Java Spring Boot Backend (Port 9090)
cd backend && mvn spring-boot:run

# Terminal 2 — Start React + Vite Frontend (Port 5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** to access the portfolio dashboard.

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
- **Driver Request Dispatch**: Broadcasts ride requests with explicit Accept/Decline decision options.
- **Ride State Machine**: Formal state tracking with 4-digit OTP ride verification.

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
- **Q&A Engine**: Question posting, answer submissions, voting, tag search, and comment threads.
- **Reputation Strategy**: Strategy pattern for reputation score adjustments upon upvotes/downvotes.

#### API Endpoints
- `GET /api/stackoverflow/questions`
- `POST /api/stackoverflow/questions`
- `POST /api/stackoverflow/questions/{id}/answers`
- `POST /api/stackoverflow/questions/{id}/vote`
- `POST /api/stackoverflow/questions/{id}/accept`

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
- **Expense Split Strategies**: Equal, Percentage, and Exact split calculation rules.
- **Debt Simplification**: Min-Cash-Flow graph algorithm minimizing settlement transactions.
- **Group Ledger**: Thread-safe balance ledgers with settlement tracking.

#### API Endpoints
- `POST /api/splitwise/users`
- `POST /api/splitwise/groups`
- `POST /api/splitwise/expenses`
- `GET /api/splitwise/users/{id}/balances`
- `POST /api/splitwise/settle`

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

## Tech Stack

- **Backend**: Java 17, Spring Boot 3.2, Maven (Single Spring Boot JAR, Port 9090)
- **Frontend**: React 19, Vite 8, React Router 7 (Single SPA, Port 5173)
