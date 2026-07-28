# Low-Level Design with UI

SDE-2 interview preparation (2+ years experience). Each LLD is visualized through a UI — backend in Java (Spring Boot), frontend in React (Vite).

## Projects

| # | Project | Port | Domain | Key Design Patterns |
|---|---------|------|--------|-------------------|
| 1 | [Parking Lot](./parking-lot) | 8080 | Multi-level parking with gates | Singleton, Strategy (pricing), Factory, Repository, Concurrency (ReentrantLock) |
| 2 | [Zomato](./zomato) | 8081 | Food delivery | State Machine, Strategy, Repository |
| 3 | [Uber](./uber) | 8082 | Ride-hailing | State Machine, Strategy (pricing), Repository, Haversine distance |
| 4 | [Stack Overflow](./stackoverflow) | 8083 | Q&A platform | Strategy (reputation), Factory, Repository, Tag-based search |
| 5 | [Tic Tac Toe](./tic-tac-toe) | 8084 | 2-player game | State Machine, Game loop, Win detection |
| 6 | [Snake & Ladders](./snake-ladders) | 8085 | Multiplayer board game | State Machine, Board design, Snake/Ladder mapping |
| 7 | [ATM](./atm) | 8086 | Banking ATM | State Machine, Thread Safety (ReentrantLock), Authentication |
| 8 | [Splitwise](./splitwise) | 8087 | Expense sharing | State Machine, Split Strategies (Equal/Percentage/Exact), Balance calculation |
| 9 | [Elevator](./elevator) | 8088 | Elevator Control | SCAN Scheduling, Proximity-based assignment, Thread Safety (ReentrantLock) |

## Design Patterns & OOPs Concepts

| Pattern | Where | Why |
|---------|-------|-----|
| **Singleton** | `ParkingLotService` | Single system instance managing all operations |
| **Strategy** | `ReputationStrategy` / `PricingStrategy` | Swap algorithms (voting impact, parking rates) at runtime |
| **Factory** | Spot/Entity creation | Encapsulate object creation logic |
| **State Machine** | `OrderStatus`, `RideStatus`, `GameState` | Formal state transitions with guards |
| **Repository** | All projects | Abstract data storage behind interface |
| **Encapsulation** | All models | Data + behavior in single unit |
| **SOLID** | All layers | SRP (Controller/Service/Repo), OCP (extensible via Strategy), DIP (abstractions over concretions) |
| **Concurrency** | `ReentrantLock` in Parking Lot | Thread-safe spot assignment |

## OOPs Principles Demonstrated

- **Encapsulation** — Models bundle state with behavior (`Ticket` tracks own entry/exit)
- **Inheritance** — Shared behavior via interfaces (`ReputationStrategy` → `QuestionReputationStrategy`, `AnswerReputationStrategy`)
- **Polymorphism** — Strategy pattern swaps implementations at runtime
- **Abstraction** — Repository hides storage details; Service hides business logic complexity

## How to Run

```bash
# Terminal 1 — Backend (choose one)
cd parking-lot/backend     && mvn spring-boot:run    # port 8080
cd zomato/backend          && mvn spring-boot:run    # port 8081
cd uber/backend            && mvn spring-boot:run    # port 8082
cd stackoverflow/backend   && mvn spring-boot:run    # port 8083
cd tic-tac-toe/backend     && mvn spring-boot:run    # port 8084
cd snake-ladders/backend   && mvn spring-boot:run    # port 8085
cd atm/backend             && mvn spring-boot:run    # port 8086
cd splitwise/backend       && mvn spring-boot:run    # port 8087
cd elevator/backend         && mvn spring-boot:run    # port 8088

# Terminal 2 — Frontend (choose one)
cd parking-lot/frontend     && npm run dev
cd zomato/frontend          && npm run dev
cd uber/frontend            && npm run dev
cd stackoverflow/frontend   && npm run dev
cd tic-tac-toe/frontend     && npm run dev
cd snake-ladders/frontend   && npm run dev
cd atm/frontend             && npm run dev
cd splitwise/frontend       && npm run dev
cd elevator/frontend         && npm run dev
```

## Project Details

### 1. Parking Lot (port 8080)
**Features:** Multi-floor parking with entry/exit gates, vehicle types (CAR/BIKE/TRUCK), real-time spot tracking, ticket-based pricing, active ticket monitoring
**APIs:** `GET /gates`, `POST /entry`, `POST /exit`, `GET /floors`, `GET /spots/available`, `GET /tickets/active`

### 2. Zomato (port 8081)
**Features:** Restaurant browsing, menu ordering, cart management, order state machine (PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED), delivery partner assignment
**APIs:** `GET /restaurants`, `GET /menu`, `POST /orders`, `GET /orders`, `PUT /orders/{id}/status`

### 3. Uber (port 8082)
**Features:** Location-based fare estimation (Haversine), vehicle types (Go/XL/Premium), driver assignment, ride state machine (REQUESTED → ACCEPTED → ARRIVED → STARTED → COMPLETED)
**APIs:** `GET /estimate`, `POST /rides`, `GET /rides`, `PUT /rides/{id}/status`

### 4. Stack Overflow (port 8083)
**Features:** Q&A with voting, reputation system (Strategy pattern), tag-based search, comments, accept answer, concurrent access safety
**APIs:** `GET /questions`, `POST /questions`, `POST /questions/{id}/answers`, `POST /questions/{id}/vote`, `POST /questions/{id}/accept`, `POST /answers/{id}/vote`, `POST /comments`

### 5. Tic Tac Toe (port 8084)
**Features:** 2-player game on 3x3 grid, turn management, win/draw detection, reset & new game
**APIs:** `POST /games`, `GET /games/{id}`, `POST /games/{id}/move`, `POST /games/{id}/reset`

### 6. Snake & Ladders (port 8085)
**Features:** Multiplayer (2-4 players), 10x10 board, dice roll, snake/ladder mappings, turn management, win detection
**APIs:** `POST /games`, `GET /games/{id}`, `POST /games/{id}/roll`

### 7. ATM (port 8086)
**Features:** Card + PIN authentication, balance inquiry, cash withdrawal (preset + custom amounts), cash deposit, transaction history, receipt printout, ATM machine UI with keypad
**APIs:** `POST /api/atm/authenticate`, `GET /api/atm/{accountNumber}/balance`, `POST /api/atm/{accountNumber}/withdraw`, `POST /api/atm/{accountNumber}/deposit`, `GET /api/atm/{accountNumber}/transactions`

### 8. Splitwise (port 8087)
**Features:** User/group management, expense creation with EQUAL/PERCENTAGE/EXACT split, balance calculation, settle up, transaction history, concurrent access safety
**APIs:** `POST /api/splitwise/users`, `GET /api/splitwise/users`, `POST /api/splitwise/groups`, `GET /api/splitwise/groups`, `POST /api/splitwise/expenses`, `GET /api/splitwise/groups/{id}/expenses`, `GET /api/splitwise/users/{id}/balances`, `POST /api/splitwise/settle`, `GET /api/splitwise/users/{id}/transactions`

### 9. Elevator (port 8088)
**Features:** 4 elevators, 10 floors, SCAN scheduling algorithm, proximity-based assignment, capacity limits, animated elevator movement with door open/close, floor call buttons, request log, thread-safe concurrent processing
**APIs:** `GET /api/elevator/elevators`, `POST /api/elevator/request`, `GET /api/elevator/requests`, `POST /api/elevator/tick`

## Tech Stack
- **Backend:** Java 17, Spring Boot 3.2, Maven
- **Frontend:** React 19, Vite 8
