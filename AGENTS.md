# LLD-with-UI — Context

## Architecture
- **Backend**: Java 17 + Spring Boot 3.2 (port 9090). Single JAR, all modules under `com.lld.*`
- **Frontend**: React 19 + Vite + React Router 7. Single SPA, dynamically loads LLD pages
- **Data**: In-memory only (no DB). State resets on restart.

## Patterns
- Backend owns ALL business logic. Frontend is a thin API-calling shell.
- All modules use in-memory `ConcurrentHashMap` + `ReentrantLock` for thread safety.
- CORS: `@CrossOrigin(origins = "*")` on every controller.
- Frontend: one folder per LLD in `src/lld/`, each with `{Name}Page.jsx` + `api.js`.
- **Terminal Execution**: ALWAYS use WSL (`wsl <command>`) for running commands.

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
- Thread Safety: `ConcurrentHashMap` repository + `ReentrantLock` for atomic balance ledger mutations.

### Frontend
- 6 tabs: 💰 Expense Manager, 📊 Balance Dashboard, 📜 Activity Feed, 🕹️ Interactive 2D Simulation, Class Diagram, Design Details.
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

