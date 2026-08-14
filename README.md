# Low-Level Design with UI

SDE-2 interview preparation (2+ years experience). **45 LLD projects** in a **single unified backend + frontend** — Java Spring Boot backend, React + Vite frontend.

## Projects

| # | Project | Domain | Key Design Patterns |
|---|---------|--------|-------------------|
| 1 | [Parking Lot](#1-parking-lot) | Multi-level parking with gates | Singleton, Strategy (pricing/spot), Factory, Repository, Concurrency (ReentrantLock) |
| 2 | [Zomato](#2-zomato) | Food delivery | State Machine, Strategy (payment), Observer, Repository, OTP Handoff |
| 3 | [Uber](#3-uber) | Ride-hailing | State Machine, Strategy (pricing), Repository, Haversine distance, OTP Verification |
| 4 | [Stack Overflow](#4-stack-overflow) | Q&A platform | Strategy (reputation), Factory, Repository, Tag-based search |
| 5 | [Tic Tac Toe](#5-tic-tac-toe) | 2-player game | State Machine, Game loop, Win detection |
| 6 | [Snake & Ladders](#6-snake--ladders) | Multiplayer board game | State Machine, Board design, Snake/Ladder mapping |
| 7 | [ATM](#7-atm) | Banking ATM | State Machine, Thread Safety (ReentrantLock), Authentication |
| 8 | [Splitwise](#8-splitwise) | Expense sharing | State Machine, Split Strategies (Equal/Percentage/Exact), Balance calculation |
| 9 | [Elevator](#9-elevator) | Elevator Control | SCAN Scheduling, Proximity-based assignment, Thread Safety (ReentrantLock) |
| 10 | Library Management | Book Catalog & Loans | Strategy, Factory, Observer |
| 11 | [Movie Ticket Booking](#11-movie-ticket-booking) | Cinema Seats & Shows | Singleton, Strategy (pricing), Factory, Observer, State Machine, Per-Seat ReentrantLock Concurrency, Hold TTL, Idempotency |
| 12 | Hotel Management | Room Reservation | State Machine, Strategy, Factory |
| 13 | Airline Reservation | Flight Booking & Seats | State Machine, Strategy |
| 14 | Coffee Machine | Ingredient & Brew Engine | State Pattern, Factory, Decorator |
| 15 | Digital Wallet | Payment & Ledger | Command Pattern, Transactional Lock |
| 16 | Chess | 2-Player Strategy Game | Command, State, Strategy |
| 17 | Ludo | Multiplayer Board Game | State Machine, Game Loop |
| 18 | Inventory Management | Stock & Warehouse | Observer, Strategy |
| 19 | Shopping Cart | E-Commerce Cart & Discounts | Strategy, Command |
| 20 | Minesweeper | Grid Mine Game | Recursion, Game Loop |
| 21 | Vending Machine | State-based Dispenser | State Pattern, Chain of Responsibility |
| 22 | Logging Framework | Log Sink Engine | Chain of Responsibility, Singleton |
| 23 | Traffic Signal | Signal Timing Engine | State Pattern, Observer |
| 24 | Task Management System | Task Workflow | State Pattern, Strategy |
| 25 | LinkedIn | Professional Network | Graph Model, Observer |
| 26 | LRU Cache | In-Memory Cache | Doubly Linked List + HashMap |
| 27 | Pub Sub System | Message Broker | Observer, Producer-Consumer |
| 28 | Car Rental System | Vehicle Fleet & Booking | State Machine, Strategy |
| 29 | Online Auction System | Bidding Engine | Observer, Strategy |
| 30 | Restaurant Management | Order & Kitchen Workflow | State Machine, Factory |
| 31 | Social Network | Posts & Feeds | Graph Model, Observer |
| 32 | Concert Ticket Booking | Event Seats & Reservation | Concurrency Lock, State Machine |
| 33 | CricInfo | Live Cricket Scorecard | Observer Pattern, Event Listener |
| 34 | Course Registration System | Student Enrollment | Strategy, Observer |
| 35 | Stock Brokerage Platform | Trading & Portfolio | Strategy, Observer, Order Book |
| 36 | Music Streaming Service | Audio Catalog & Playlists | Strategy, Factory |
| 37 | FooBar Alternately | Multithreading Concurrency | Semaphore / ReentrantLock |
| 38 | Zero Even Odd | Multithreading Concurrency | Semaphore Synchronization |
| 39 | Fizz Buzz Multithreaded | Multithreading Concurrency | CyclicBarrier / Condition |
| 40 | Building H2O | Multithreading Concurrency | Barrier / Semaphore |
| 41 | Thread-Safe TTL Cache | Concurrent Caching | Scheduled Executor, ConcurrentHashMap |
| 42 | Concurrent HashMap | Concurrent Data Structure | Segment Locking / Bucket Lock |
| 43 | Blocking Queue | Concurrent Queue | Producer-Consumer, ReentrantLock + Condition |
| 44 | Concurrent Bloom Filter | Probabilistic Structure | BitSet + Hash Functions |
| 45 | Multi-threaded Merge Sort | Parallel Sorting | ForkJoinPool / RecursiveTask |

## Architecture

```
lld-with-ui/
├── backend/              ← Spring Boot app (port 9090)
│   └── src/main/java/com/lld/
│       ├── atm/           ← ATM
│       ├── elevator/      ← Elevator
│       ├── movieticket/   ← Movie Ticket Booking (BookMyShow)
│       ├── parkinglot/    ← Parking Lot
│       ├── snakeladders/  ← Snake & Ladders
│       ├── splitwise/     ← Splitwise
│       ├── stackoverflow/ ← Stack Overflow
│       ├── tictactoe/     ← Tic Tac Toe
│       ├── uber/          ← Uber
│       ├── zomato/        ← Zomato
│       └── config/        → CORS config
├── frontend/              ← React + Vite SPA
│   ├── src/
│   │   ├── components/    → ClassDiagram (reusable)
│   │   ├── data/          → classDiagrams.js, designDetails.js
│   │   ├── lld/           → one folder per project
│   │   │   ├── atm/
│   │   │   ├── elevator/
│   │   │   ├── movieticket/
│   │   │   ├── parking/
│   │   │   ├── snakeladders/
│   │   │   ├── splitwise/
│   │   │   ├── stackoverflow/
│   │   │   ├── tictactoe/
│   │   │   ├── uber/
│   │   │   └── zomato/
│   │   └── pages/         → Home page
│   └── public/
└── README.md
```

## Quick Start

```bash
# Terminal 1 — Start the unified backend (port 9090)
cd backend && mvn spring-boot:run

# Terminal 2 — Start the unified frontend (port 5173)
cd frontend && npm run dev
```

Then open http://localhost:5173 and click any LLD card.

## Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| **Singleton** | `ParkingLotService`, `MovieTicketService` | Single system instance managing all operations |
| **Strategy** | `ReputationStrategy`, `PricingStrategy`, `SplitStrategy` | Swap algorithms (voting impact, seat prices, split calculations) at runtime |
| **Factory** | Spot/Seat/Entity creation | Encapsulate object creation logic |
| **Observer** | `SeatMapNotifier` / Event loggers | Broadcast status change events to subscribers |
| **State Machine** | `OrderStatus`, `RideStatus`, `SeatStatus`, `GameState` | Formal state transitions with guards |
| **Repository** | All projects | Abstract data storage behind interface |
| **Encapsulation** | All models | Data + behavior in single unit |
| **SOLID** | All layers | SRP (Controller/Service/Repo), OCP (extensible via Strategy), DIP (abstractions over concretions) |
| **Concurrency** | `SeatLockManager` (per-seat ReentrantLock), `ConcurrentHashMap` | Fine-grained thread-safe state mutations with deadlock prevention |

## OOPs Principles

- **Encapsulation** — Models bundle state with behavior (`Ticket` tracks own entry/exit, `Seat` manages status & TTL)
- **Inheritance** — Shared behavior via interfaces (`PricingStrategy` → `BasePricingStrategy`, `SurgePricingStrategy`)
- **Polymorphism** — Strategy pattern swaps implementations at runtime (pricing strategies, split types)
- **Abstraction** — Repository hides storage details; Service hides business logic; Controller exposes clean API

## Project Details

### 1. Parking Lot
**Features:** Multi-floor parking with entry/exit gates, vehicle types (CAR/BIKE/TRUCK), real-time spot tracking, ticket-based pricing, active ticket monitoring  
**APIs:** `GET /api/parking/gates`, `POST /api/parking/entry`, `POST /api/parking/exit`, `GET /api/parking/floors`, `GET /api/parking/spots/available`, `GET /api/parking/tickets/active`

### 2. Zomato
**Features:** Multi-entity domain model (Customer, Restaurant, MenuItem, DeliveryAgent, Order, Payment, Notification), order state machine lifecycle (`PLACED` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `READY_FOR_PICKUP` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED` / `CANCELLED`), 4-digit OTP handoff verification, extensible payment strategies (UPI, Credit Card, Debit Card, Wallet, COD), automated refund processing, real-time notification engine, thread-safe `ConcurrentHashMap` repository with `ReentrantLock`, 8-step Interactive 2D Simulation scene (night city skyline, kitchen smoke particles, moving scooter, live HUD) calling real Spring Boot REST APIs, and color-accented section card layouts.  
**APIs:** `GET /api/zomato/restaurants`, `GET /api/zomato/customers`, `GET /api/zomato/agents`, `POST /api/zomato/orders`, `GET /api/zomato/orders`, `POST /api/zomato/orders/{id}/confirm`, `POST /api/zomato/orders/{id}/prepare`, `POST /api/zomato/orders/{id}/ready`, `POST /api/zomato/orders/{id}/deliver`, `POST /api/zomato/orders/{id}/cancel`, `PUT /api/zomato/menu/availability`, `PUT /api/zomato/agents/availability`

### 3. Uber
**Features:** Pre-booking fare estimation (Haversine distance & duration), vehicle types (Go/XL/Premium), driver request broadcasting with explicit Accept/Decline decision, 4-digit OTP verification, interactive 2D city map scene, ride lifecycle state machine (REQUESTED → ACCEPTED → ONGOING → DESTINATION_REACHED / PAYMENT_PENDING → COMPLETED / PAYMENT_FAILED / CANCELLED), and rider payment checkout  
**APIs:** `GET /api/uber/estimate`, `POST /api/uber/rides`, `GET /api/uber/rides`, `GET /api/uber/drivers/{driverId}/requests`, `PUT /api/uber/rides/{id}/accept`, `PUT /api/uber/rides/{id}/decline`, `PUT /api/uber/rides/{id}/verify-otp`, `PUT /api/uber/rides/{id}/start`, `PUT /api/uber/rides/{id}/arrive`, `PUT /api/uber/rides/{id}/complete`, `PUT /api/uber/rides/{id}/cancel`

### 4. Stack Overflow
**Features:** Q&A with voting, reputation system (Strategy pattern), tag-based search, comments, accept answer, concurrent access safety  
**APIs:** `GET /api/stackoverflow/questions`, `POST /api/stackoverflow/questions`, `POST /api/stackoverflow/questions/{id}/answers`, `POST /api/stackoverflow/questions/{id}/vote`, `POST /api/stackoverflow/questions/{id}/accept`, `POST /api/stackoverflow/answers/{id}/vote`, `POST /api/stackoverflow/comments`

### 5. Tic Tac Toe
**Features:** Multi-mode game engine (Human vs Human 2-player local, Human vs AI), Strategy Pattern for AI opponents (Random vs Unbeatable Minimax algorithm), 2D winning line coordinate calculation (`winningLine`), Step-by-step move history log, atomic Undo move functionality, thread-safe session concurrency via `ReentrantLock`, 8-step Interactive 2D Arcade simulation scene (3D board grid, glowing X/O emblems, AI brain pulse indicator, neon laser winning line, live telemetry HUD), and color-accented section card layouts. Supports both `/tictactoe` and `/tic-tac-toe` routes.  
**APIs:** `POST /api/tictactoe/games`, `GET /api/tictactoe/games/{id}`, `POST /api/tictactoe/games/{id}/move`, `POST /api/tictactoe/games/{id}/undo`, `POST /api/tictactoe/games/{id}/reset`

### 6. Snake & Ladders
**Features:** Multiplayer (2-4 players), 10x10 board, dice roll, snake/ladder mappings, turn management, win detection  
**APIs:** `POST /api/snakeladders/games`, `GET /api/snakeladders/games/{id}`, `POST /api/snakeladders/games/{id}/roll`

### 7. ATM
**Features:** Card + PIN authentication, balance inquiry, cash withdrawal (preset + custom amounts), cash deposit, transaction history, receipt printout, ATM machine UI with keypad  
**APIs:** `POST /api/atm/authenticate`, `GET /api/atm/{accountNumber}/balance`, `POST /api/atm/{accountNumber}/withdraw`, `POST /api/atm/{accountNumber}/deposit`, `GET /api/atm/{accountNumber}/transactions`

### 8. Splitwise
**Features:** User/group management, expense creation with EQUAL/PERCENTAGE/EXACT split, balance calculation, settle up, transaction history, concurrent access safety  
**APIs:** `POST /api/splitwise/users`, `GET /api/splitwise/users`, `POST /api/splitwise/groups`, `GET /api/splitwise/groups`, `POST /api/splitwise/expenses`, `GET /api/splitwise/groups/{id}/expenses`, `GET /api/splitwise/users/{id}/balances`, `POST /api/splitwise/settle`, `GET /api/splitwise/users/{id}/transactions`

### 9. Elevator
**Features:** 4 elevators, 10 floors, SCAN scheduling algorithm, proximity-based assignment, capacity limits, animated elevator movement with door open/close, floor call buttons, request log, thread-safe concurrent processing  
**APIs:** `GET /api/elevator/elevators`, `POST /api/elevator/request`, `GET /api/elevator/requests`, `POST /api/elevator/tick`

### 11. Movie Ticket Booking (BookMyShow)
**Features:** Multi-entity domain model (Movie, Theater, Screen, Show, Seat, Booking, User), per-seat `ReentrantLock` concurrency (`showId:seatId`), deadlock prevention via ascending lock ordering, seat-hold lifecycle (`AVAILABLE` $\rightarrow$ `HELD` (5m TTL) $\rightarrow$ `BOOKED` / `AVAILABLE`), `@Scheduled` background stale hold cleanup, Strategy Pattern (`BasePricingStrategy` & `SurgePricingStrategy`), Observer Pattern (`SeatMapNotifier`), Idempotency key protection, 5-tab React UI (Movies & Booking, Booking History, Interactive 2D Concurrency Simulation, Class Diagram, Design Details), live 3s seat map polling, 5-minute hold countdown timer, and 8-step scripted simulation scene calling isolated `/api/movie-ticket/sim/*` endpoints.  
**APIs:** `GET /api/movie-ticket/movies`, `GET /api/movie-ticket/theaters`, `GET /api/movie-ticket/movies/{id}/shows`, `GET /api/movie-ticket/shows/{id}/seats`, `POST /api/movie-ticket/shows/{id}/hold`, `POST /api/movie-ticket/book`, `POST /api/movie-ticket/cancel`, `GET /api/movie-ticket/bookings/{id}`, `GET /api/movie-ticket/bookings/user/{userId}`

## Tech Stack
- **Backend:** Java 17, Spring Boot 3.2, Maven (single app on port 9090)
- **Frontend:** React 19, Vite 8, React Router 7 (single SPA)
