# LLD-with-UI — Context

## Architecture
- **Backend**: Java 17 + Spring Boot 3.2 (port 59190, override with `BACKEND_PORT`). Single JAR, all modules under `com.lld.*`
- **Swagger / OpenAPI**: SpringDoc UI at `http://localhost:59190/swagger-ui.html` and JSON at `/v3/api-docs`
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
cd backend  && mvn test        # currently 1465 tests
cd frontend && npx vitest run  # currently 304 tests
cd frontend && npm run build   # entry chunk must stay under 500 kB
```

## Parking Lot Module
### Backend
Raised from "fairly mature but ungoverned" (real Strategy + Factory for both pricing and spot
assignment, but zero typed exceptions, a single service test file, and a `dto`/`ParkingLotDocumentationService`
pair silently duplicating the frontend's own design/diagram data) to the reference bar — same pass
shape as elevator/ludo.
- `ParkingLotInitializer`: 3 floors, 10 spots each (4 CAR + 4 BIKE + 2 TRUCK). Gates: G1/G2=ENTRY, G3/G4=EXIT.
- `ParkingLotService`: `entry(gateId, vehicleNumber, vehicleType, strategy)` → assigns a spot via the selected `SpotAssignmentStrategy` and creates a ticket; `scanTicket(...)` → read-only price preview on a throwaway ticket copy, spot and live ticket untouched; `payAndExit(...)` → atomically finalizes payment and releases the spot.
- Pricing: `HourlyPricingStrategy` (CAR=₹20/hr, BIKE=₹10/hr, TRUCK=₹40/hr, 1hr minimum), `FlatRatePricingStrategy` (flat per-type rate), `DynamicPricingStrategy` (1.5x surge over the hourly base).
- **Strategy Pattern + Factory, upgraded to EnumMap** — `com.lld.parkinglot.strategy`: `PricingStrategyFactory` and `SpotAssignmentStrategyFactory` were already real (both pre-existing), but resolved strategies through a `Map<String, ...>` keyed by raw uppercase strings. Both now parse the request string to a `PricingStrategyType`/`SpotAssignmentStrategyType` enum and resolve through an `EnumMap` built once in the constructor — the same shape as `inventory.strategy.ReorderStrategyFactory`. The service never branches on the policy itself; an unknown strategy name now throws `InvalidParkingRequestException` (400) instead of a bare `IllegalArgumentException`.
- **Exception hierarchy (new)**: `ParkingLotException` (abstract) `extends com.lld.config.DomainException`, with `GateNotFoundException` (404), `InvalidGateTypeException` (400 — entering through an EXIT gate or exiting through an ENTRY gate), `VehicleTypeNotSupportedException` (400 — an unparseable `VehicleType` string), `SpotNotAvailableException` (409 — every spot of the requested type is occupied), `SpotNotFoundException` (404 — `releaseSpot` given an unknown id), `TicketNotFoundException` (404), `TicketAlreadyExitedException` (409), `InvalidParkingRequestException` (400 — null body, blank vehicle type, unknown strategy name). `ParkingLotController` no longer hand-catches every endpoint into a flat `ResponseEntity.badRequest()` — that swallowed the real status code every one of these carries (a missing gate returned 400, not 404) — it now lets `GlobalExceptionHandler` resolve the status from each exception's `@ResponseStatus`.
- **Concurrency, closing the double-exit race**: spot allocation was already correctly guarded — `occupySpot` holds one `spotLock` across the *entire* search-then-claim, not a per-spot lock, because the assignment strategy has to scan every spot to pick one; that's the right granularity here, not a bug. What was missing was the exit side: `payAndExit` used to check `ticket.getExitTime() == null` and then, unguarded, set it — a classic check-then-act race where two concurrent exits for the same ticket could both read "still open" and both charge/release. `ParkingLotRepository#completeExit` now folds the not-found / already-exited check and the PAID mutation (including computing the price, using the strategy) into one `ticketLock` acquisition. `ParkingLotConcurrencyTest` proves both races directly with `CountDownLatch`-synchronized threads: exactly one of 12 threads wins the last CAR spot (the rest cleanly rejected with `SpotNotAvailableException`, run 5x via `@RepeatedTest`), exactly one of 10 threads wins a contested ticket's exit (the rest `TicketAlreadyExitedException`, also `@RepeatedTest(5)`), and CAR/BIKE entries racing concurrently never cross-assign a spot of the wrong type.
- **Lombok models**: `Floor`, `Gate`, `ParkingSpot`, `Ticket` converted from `@Getter @Setter` to `@Data @Builder @NoArgsConstructor @AllArgsConstructor`, matching `inventory.model.Product`'s shape; each model's existing convenience constructor (e.g. `new Ticket(ticketNumber, vehicleNumber, vehicleType, spotId, entryTime)`) is kept alongside the generated one.
- **`dto`/`ParkingLotDocumentationService` removed as a legacy deviation**: this module used to additionally serve `GET /api/parking/class-diagram` and `GET /api/parking/design-details`, backed by `ClassDiagramDto`/`DesignDetailsDto` and a hand-maintained copy of the exact same prose that `frontend/src/data/design/parking.js` / `diagrams/parking.js` already own — a second source of truth guaranteed to drift (and it had: the backend copy still described the pre-Strategy-Factory `switch`-based design). The frontend's `getParkingClassDiagram()`/`getParkingDesignDetails()` API wrappers were never actually called anywhere in `ParkingLotPage.jsx` (`classDiagramData`/`designDetailsData`/`loadingDoc` state existed but nothing fetched into it or read it back — the `design`/`diagram` tabs are rendered by `LldPage` itself from the frontend's own data, per this repo's actual convention). Both endpoints, `ParkingLotDocumentationService`, `ClassDiagramDto`, `DesignDetailsDto`, and the dead frontend state/imports are removed; `ParkingSpotRequestDto` (the real, `@Valid`-annotated entry request body) is untouched.
- Isolated `/api/parking/sim/*` engine (new): `ParkingLotSimService` owns its own 2-floor, 10-spot lot (4 CAR + 4 BIKE + 2 TRUCK), its own `SIM-G1`/`SIM-G2` gates, its own tickets, and a `SimEvent` telemetry log — entirely separate `ConcurrentHashMap`/lock state from the live repository, so a replayed demo can never occupy a real spot or issue a real ticket. Reuses the same `SpotAssignmentStrategyFactory`/`PricingStrategyFactory` beans as the live service, so the pricing and assignment math is never duplicated — only the state is sandboxed. `reset()`/`entry()`/`scan()`/`pay()`/`getState()`/`getEvents()` mirror the live service's shape.
- Tests (1 file -> 6): `ParkingLotServiceTest` (expanded — typed-exception assertions replacing `IllegalArgumentException`/`IllegalStateException`, scan-preview isolation from the live ticket), `ParkingLotPricingStrategyTest` (new — pins the exact math of all three pricing strategies plus the factory's string resolution and default), `ParkingLotSpotAssignmentStrategyTest` (new — pins Nearest/Farthest selection order, type filtering, occupied-spot exclusion, factory resolution), `ParkingLotRepositoryTest` (new — `occupySpot`/`releaseSpot`/`completeExit`/`generateTicketNumber`/`getActiveTickets` are real independent locking and sequencing behavior, not a bare CRUD wrapper), `ParkingLotConcurrencyTest` (new, see above), `ParkingLotSimServiceTest` (new — sandbox reset/entry/scan/pay/double-pay rejection).

### Frontend
- 8 tabs: Entry, Exit, Spots, Tickets, Interactive Simulation, Class Diagram, Sequence Diagram, Design Details.
- Entry/Exit/Spots/Tickets tabs call the real, live `/api/parking/*` endpoints only — unchanged by this pass.
- Interactive simulation tab (pre-existing 9-step animated flow, rewired): previously called the *live* `/parking/entry`/`/parking/exit/scan`/`/parking/exit/pay` endpoints directly, meaning every demo run created real tickets and occupied real spots visible to the Spots/Tickets tabs — exactly the corruption the isolated `/sim/*` convention exists to prevent. Now calls `simEntry`/`simScan`/`simPay`/`simReset` against the sandbox instead; the on-screen parking grid shrank from 12 cells to the sandbox's real 10-spot layout, and a reverse-chronological sandbox event-log panel (telemetry HUD) was added below the animated scene.
- SpotGrid polls `/floors` every 5s. ActiveTickets polls `/tickets/active` every 5s.
- New sequence diagram (`data/sequences/parking.js`) walks two concurrent `payAndExit` calls racing to pay and exit the same ticket through `completeExit`'s single lock acquisition, showing why the second call's status read only ever sees post-commit ticket state.
- `DesignDetails` component renders requirements, entities, design patterns, SOLID, OOP concepts, extensibility — content refreshed in `data/design/parking.js` to describe the EnumMap factories, the exception hierarchy, and the sim engine (removing stale claims about a pre-Strategy `switch` statement).

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
- `TicTacToeService`: `createGame`, `getGame`, `makeMove`, `undoLastMove`, `resetGame` — a 2-player, human-vs-human 3x3 board. There is no AI opponent, `GameMode`, or `AIDifficulty` in this codebase (an earlier version of this doc described a Minimax AI that was never actually implemented — corrected here).
- `Game`/`Board`/`Cell`: `Board` owns the 3x3 grid, cell occupancy, the O(N) row/column/diagonal win scan (returns the exact `[startRow, startCol, endRow, endCol]` winning line), and fill/draw detection; `Game` owns turn order, status, winner, and move history.
- Exception hierarchy: `TicTacToeException` (abstract) `extends com.lld.config.DomainException` with `GameNotFoundException` (404), `InvalidMoveException` (400, out-of-bounds), `CellOccupiedException` (422, rule violation), `NotYourTurnException` (409), `GameOverException` (409) — replacing the previous ad hoc `IllegalArgumentException`/`IllegalStateException` + manual controller `try/catch` building `ErrorResponse` by hand.
- Concurrency: a per-game `ReentrantLock` (`ConcurrentHashMap<String, ReentrantLock>`, `computeIfAbsent`) held for the whole span of `makeMove`/`undoLastMove`/`resetGame`, mirroring `ChessService`.
- Isolated `/api/tictactoe/sim/*` engine: a second `GameRepository` instance (`simReset`/`simGetGame`/`simMove`/`simUndo`/`simGetEventLog`) so the demo cannot touch a real match; `simReset` seeds a fresh Alice-vs-Bob game and clears the `SimEvent` log.
- Tests: `TicTacToeServiceTest` (row/column/main-diagonal/anti-diagonal win detection — including from a mid-game fork position, not just an empty-board opening — draw, undo, reset, every exception path, sim-engine isolation), `TicTacToeConcurrencyTest` (two and twenty threads racing the same cell on one game — exactly one wins; disjoint games never contend).

### Frontend
- Uses the shared `LldPage` shell. Tabs: board, history, simulation, diagram, details.
- Routes: `/tic-tac-toe` and `/tictactoe`.
- The Simulation tab now drives the isolated `/api/tictactoe/sim/*` sandbox (it previously called the real game endpoints directly, so replaying the scripted demo could corrupt an in-progress match).

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
Audited from HANDOFF.md's "unverified" list — the module already had `repository/`, `factory/` and
`strategy/` packages and a real concurrency test, closer to the bar than most of that list, but two
of its "patterns" turned out to be dead code and its exception hierarchy had never been wired into
the shared contract. Raised in place, same audit-and-harden shape as shoppingcart/stockbroker.
- `MovieTicketInitializer`: Sample movies (Inception, The Dark Knight, Interstellar), theaters (PVR Superplex, Cinepolis), screens, shows, seats, and users.
- `MovieTicketService`: getMovies, getShows, getSeats, holdSeats, bookSeats, cancelBooking, getUserBookings, and isolated sim methods (`simReset`, `simGetSeats`, `simGetEvents`, `simHoldSeats`, `simBookSeats`, `simExpireHold`, `simCancelBooking`).
- Concurrency & Double-Booking Prevention: `SeatLockManager` using per-seat `ReentrantLock` (`showId:seatId`), deadlock prevention via ascending seat ID acquisition, and 5-minute hold TTL.
- **Strategy pattern, actually wired up (fixed)**: `SurgePricingStrategy` existed but was dead code — `MovieTicketService`'s constructor took a concrete `BasePricingStrategy` directly, so nothing in the running app ever selected it. New `PricingStrategyFactory` (`com.lld.movieticket.strategy`, `EnumMap<PricingTier, PricingStrategy>`, the same shape as `inventory.strategy.ReorderStrategyFactory`) classifies each `Show` by its `showTime` — 5 PM or later is `PEAK` (gets `SurgePricingStrategy`'s 25% markup), everything else (including an unparseable time) is `STANDARD` (`BasePricingStrategy`) — and every pricing call site in the service now goes through `pricingStrategyFactory.resolve(show)` instead of a single fixed strategy.
- **Factory pattern, actually wired up (fixed)**: `SeatFactory.createSeat` existed but `MovieTicketRepository#createShowWithSeats` constructed every `Seat` inline instead of calling it. Now delegates to the factory (identical seed pricing — GOLD 350.0, SILVER 200.0 — so no seed data changed).
- **Exception hierarchy, migrated onto the shared contract (RCA-035)**: `MovieTicketException` used to extend bare `RuntimeException` with its own hand-rolled `errorCode` field, invisible to `DomainExceptionContractTest`'s classpath scan; `MovieTicketController` caught each concrete subclass itself to hand-build a `Map.of("error", e.getErrorCode(), "message", ...)` body. Now `MovieTicketException` is `abstract` and `extends com.lld.config.DomainException` (the `TicTacToeException` shape — no `BASES` allowlist entry needed), each subclass carries `@ResponseStatus`, and the controller's five local handlers are gone — `GlobalExceptionHandler` covers all of it in the standard `ErrorResponse` shape. Statuses unchanged from what the removed handlers already returned: `SeatNotAvailableException` (409), `HoldExpiredException` (410), `BookingFailedException` (422), `CancellationFailedException` (400), `InvalidShowException` (404).
- **Concurrency bug, found and fixed (RCA-035)**: `cancelBooking` read-checked-and-wrote a booking's status plus the show's `availableSeats` counter with no lock — two concurrent cancels on the same booking could both pass the "not already cancelled" check and both increment `availableSeats`, inflating it past the show's real capacity. Fixed with a per-booking `ReentrantLock` (`bookingLocks`, lazily populated via `computeIfAbsent`, the same idiom `gameLocks` uses in `tictactoe.service.TicTacToeService`).
- Lombok (`@Getter @Setter`) across the model package (`Movie`, `Theater`, `Screen`, `Show`, `Seat`, `Booking`, `User`, `SimEvent`) — hand-rolled boilerplate accessors removed; each model's non-trivial derived accessors (`Seat#getType/setType(String)`, `Seat#isAvailable/setAvailable(boolean)`, `Booking#getStatus/setStatus(String)`) and custom multi-arg constructors kept as hand-written methods alongside the generated ones.

### Frontend
- 5 tabs: 🎬 Movies & Booking, 📊 Booking History, 🕹️ Concurrency Simulation, 📐 Class Diagram, 📋 Design Details.
- Real-time seat map polling every 3s, hold countdown timer (`⏱ 4:58`), payment method selector, idempotency key support, and 8-step interactive 2D simulation scene calling isolated `/api/movie-ticket/sim/*` endpoints.
- Seat-map polling now goes through the shared `usePolling` hook; the page's previously-hardcoded
  dark-theme colors were fixed to read `theme.css` tokens (RCA-037).

### Tests (1 file -> 4)
`MovieTicketServiceTest` (pre-existing, kept — hold/book/cancel happy paths, all-or-nothing rollback,
idempotent booking, the original hold-conflict concurrency test, isolated sim-engine proof),
`MovieTicketRepositoryTest` (new — seed data shape, per-show seat indexing, `SeatFactory` pricing,
`clear()`/id-generator resets), `PricingStrategyTest` (new — base/surge pricing math, the peak/
standard showtime classification, factory resolution end-to-end), `MovieTicketConcurrencyTest` (new
— disjoint concurrent bookings all succeed, contested concurrent bookings resolve to exactly one
winner, RCA-035's cancel-booking race with its regression test).

## Elevator Module
### Backend
Raised from "working but shallow" (2 test files, a single hardcoded dispatch strategy, an unguarded
state enum, zero typed exceptions) to the reference bar — same pass shape as ludo/trafficsignal.
Auditing the two-phase dispatch flow while adding the state machine surfaced a real bug fixed as
part of this pass (RCA-026).
- **Strategy Pattern + Factory (new)** — `com.lld.elevator.strategy`: `ElevatorDispatchStrategy` now has two implementations, `LookScanDispatchStrategy` (existing distance + direction-penalty scoring with 3-tier tie-breaking) and `NearestCarDispatchStrategy` (new — the raw closest-eligible-car baseline, ignoring direction of travel entirely), resolved by `ElevatorDispatchStrategyFactory`'s `EnumMap<DispatchPolicy, ElevatorDispatchStrategy>` — the same shape as `inventory.strategy.ReorderStrategyFactory`. `GET/POST /api/elevator/policy` reads/switches the active policy at runtime; `ElevatorControllerServiceTest#nearestCarPolicyCanChooseADifferentCarThanLookScan` proves the two policies genuinely diverge on the same fleet snapshot.
- **State Pattern (new) — car lifecycle**: `com.lld.elevator.state` — one singleton class per `ElevatorState` (`IdleState`, `MovingUpState`, `MovingDownState`, `DoorOpenState`, `MaintenanceState`), each declaring its own `Set<ElevatorState> allowedNext()`, the same class-per-state shape as `taskmanagement.state.TaskState`. `Elevator#transitionTo(target)` is the one enforcement point — replacing what used to be a bare `setState()` with zero guards, a car could previously be forced from `MOVING_UP` straight to `IDLE` or `MOVING_DOWN` with no illegal-jump check anywhere. An illegal jump now throws `IllegalElevatorStateTransitionException` (409) and leaves `state` unchanged; the identity transition (e.g. `MOVING_UP -> MOVING_UP` while just continuing between floors) is always implicitly legal so callers never special-case it. `setState()` remains as a raw, unguarded setter reserved for test fixtures — production code goes through `transitionTo`.
- **Two-phase dispatch bug, fixed (RCA-026)**: `handleExternalRequest` used to take only a source floor + direction and build a *placeholder* destination (`sourceFloor +/- 1`) that then got queued as a real elevator stop — every trip made one spurious extra stop, and `completeMatchingRequests` could never match a request against the rider's actual requested floor, since it compared against that same placeholder. `handleExternalRequest(sourceFloor, destinationFloor)` now takes the real destination up front (the frontend already knows both when a rider taps "Floor 1 -> Floor 5") and `assignRequestToElevator` queues both real stops in one step — `ElevatorControllerServiceTest#tripCompletesAtTheRealRequestedDestinationNotABogusPlaceholder` pins this down. A related same-floor-assignment gap (a car assigned a call at the floor it was already idling on never removed that floor from its own pending-stop set) was fixed alongside it.
- **Exception hierarchy (new)**: `ElevatorException` (abstract) `extends com.lld.config.DomainException` with `FloorOutOfRangeException` (400 — outside the building's `[MIN_FLOOR, MAX_FLOOR]` = `[1, 10]`), `InvalidElevatorRequestException` (400 — same source/destination floor, null dispatch policy, unknown policy string), `ElevatorNotFoundException` (404), `ElevatorUnavailableException` (409 — an internal destination call on a `MAINTENANCE` car), `IllegalElevatorStateTransitionException` (409). Abstract base excluded from `DomainExceptionContractTest`'s scan automatically, same as `LudoException`/`TaskException`.
- **Observer, wired for real**: `ElevatorNotifier` previously had zero registered `ElevatorObserver` implementations — a real Observer subject with nothing subscribed, indistinguishable from dead code. `LoggingElevatorObserver` (audit trail to the app log) and `InMemoryElevatorEventObserver` (bounded in-memory ring buffer, `recentEvents()`) are now Spring-managed beans the notifier's constructor collects automatically, the same idiom as `inventory.observer.StockAlertNotifier` collecting every `StockAlertObserver` bean. The isolated `/sim/*` sandbox deliberately does not route through this notifier at all — it keeps its own `SimEvent` log — so a replayed demo can never appear in the real telemetry stream.
- **`Elevator` stays hand-written, not Lombok** — like `trafficsignal.model.Intersection` and `atm.model.Account`, a lock-holding entity with real invariants (bounded occupancy, guarded state transitions, two `ConcurrentSkipListSet`s) keeps explicit accessors rather than accepting Lombok-generated setters that would bypass those guards. `Request`, `ElevatorSnapshot` and `SimEvent` — plain value carriers with no invariants to protect — converted to `@Data @Builder @NoArgsConstructor @AllArgsConstructor`, matching `inventory.model.Product`'s shape; `Request.of(source, destination)` replaces the old ad-hoc constructor and derives `Direction` the same way.
- **Concurrency**: one controller-wide `ReentrantLock` serializes every dispatch decision (`handleExternalRequest`/`drainPendingRequests`/`setElevatorMaintenance`) so "score the fleet" and "commit the winning car's stops" are one atomic step, plus a per-elevator `ReentrantLock` for anything that only touches one car. `ElevatorConcurrencyTest` (expanded from one test to four): N simultaneous floor requests fired through a `CountDownLatch` all land with a unique request id and a real terminal status (never lost, never merged), every `ASSIGNED` request eventually reaches `COMPLETED` after enough simulation ticks (proof no assigned stop is silently dropped), no elevator ever exceeds capacity, and concurrent maintenance toggles on one car never throw or leave it in an illegal state.
- `ElevatorSystem` (an unused, unreferenced singleton-wrapper facade duplicating `ElevatorService`) removed as dead code.
- Isolated `/api/elevator/sim/*` engine (pre-existing, kept and hardened): a separate 4-car sandbox (E1@F1, E2@F5, E3@F8, E4@F10 in `MAINTENANCE`) with its own `SimEvent` telemetry log, now sharing the same dispatch-policy factory, floor-range validation and guarded `transitionTo` the real bank uses; `simRequest`'s response now includes `assignedElevatorId` so the frontend can track a specific car through the demo without matching on name.
- Tests (2 files -> 8): `ElevatorControllerServiceTest` (new — dispatch, floor-range/not-found/unavailable exceptions, idempotent maintenance toggles, orphaned-stop reassignment, dispatch-policy switching proving the two strategies diverge, observer notification firing, capacity across many ticks), `ElevatorLifecycleStateTest` (new — the full declared transition table, illegal-jump rejection, identity no-op, a realistic full lifecycle), `LookScanDispatchStrategyTest` (pre-existing, kept), `NearestCarDispatchStrategyTest` (new), `ElevatorDispatchStrategyFactoryTest` (new), `ElevatorRepositoryTest` (new — `getPendingRequests` status filtering and `nextRequestId` uniqueness under concurrency are real independent behavior, unlike a bare CRUD wrapper), `ElevatorConcurrencyTest` (expanded, see above).

### Frontend
- `ElevatorPage.jsx`/`api.js` rebuilt to call real endpoints only. The previous file referenced `LldPage` and `usePolling` without importing either — a real broken-build bug fixed as part of this pass — and its "simulation" tab called the live `requestElevator`/`tick` endpoints directly instead of the isolated sandbox that already existed in the backend.
- Request bodies and response fields standardized on `sourceFloor`/`destinationFloor` throughout (dropping the old `fromFloor`/`toFloor` naming) to match `Request`'s model fields exactly.
- Shared `ShaftOverlay` component renders every car absolutely positioned by floor so it can slide smoothly between floors, with a door-open animation driven entirely by the backend's `ElevatorStatus` (previously the UI faked door timing with a client-side `setTimeout` guess because `Elevator#getStatus()` collapsed `DOOR_OPEN` into `STOPPED` — also fixed, see RCA-024) — used by both the live building (`app` tab) and the simulation tab.
- `app` tab: live 10-floor building, per-floor call buttons, elevator status cards, recent-requests list, and a dispatch-policy selector wired to `GET/POST /api/elevator/policy`.
- 8-step interactive simulation against the isolated `/api/elevator/sim/*` engine: reset the sandbox, view the seeded fleet, call an elevator (rider-chosen source/destination), step toward pickup, doors open at pickup, step toward destination, take a car offline mid-route to demonstrate orphaned-stop reassignment, and a live telemetry HUD (cars in service, cars moving, queued calls, tracked car's floor, events logged) plus a reverse-chronological event log.
- New sequence diagram (`data/sequences/elevator.js`) walks two concurrent `handleExternalRequest` calls racing the dispatch decision for the same best-scoring car through the controller-wide lock, showing why the second call's strategy read only ever sees post-commit fleet state.

## Shopping Cart Module
### Backend
Audited from HANDOFF.md's "unverified" list rather than built from scratch — the module was already
substantially real (Command pattern, Strategy pattern, a full exception set) but had only one test
file and a stale/partly-fabricated design-data page. Raised to the reference bar in place, same
audit-and-harden shape as pubsub/atm/parkinglot.
- `ShoppingCartInitializer`: seeds 3 users and a 6-product catalog across Electronics, Fashion, Home
  & Kitchen and Books, plus an initial cart for Alice.
- **Command Pattern**: `com.lld.shoppingcart.command` — `AddItemCommand`, `RemoveItemCommand`,
  `UpdateQuantityCommand` implement `CartCommand` (`execute()`/`undo()`).
  `ShoppingCartService#executeCommand` pushes every executed command onto a per-user
  `Stack<CartCommand>`; `undoLastCartCommand(userId)` pops and reverses it. **Real bug found and
  fixed during this audit**: `UpdateQuantityCommand` originally captured only the previous `int`
  quantity, so undoing an update that had dropped quantity to 0 (which removes the cart's line
  item entirely) replayed `Cart#updateQuantity(productId, oldQty)` — but that method only mutates
  an *existing* map entry, so it silently no-opped against the now-missing one and the item stayed
  gone. Fixed by snapshotting the full previous `CartItem` (not just its quantity) at command
  construction time; `undo()` now reinserts that snapshot directly whenever `Cart#updateQuantity`
  can't resurrect the entry on its own. See RCA-032.
- **Strategy Pattern**: `com.lld.shoppingcart.payment` — `PaymentStrategy` interface with
  `CreditCardPaymentStrategy`, `DebitCardPaymentStrategy`, `UpiPaymentStrategy`,
  `WalletPaymentStrategy`, resolved by `PaymentMethod` through `ShoppingCartPaymentProcessor`.
  `PaymentFailedException` is a real, reachable branch (not dead code) whenever the strategy map
  has no entry for the requested method — proven by `ShoppingCartPaymentProcessorTest` constructing
  a processor with a deliberately partial strategy list.
- **Ascending-Product-ID Lock Ordering (the concurrency centerpiece)**: `ShoppingCartService#placeOrder`
  sorts every product touched by the order by `Product#getId()` ascending and acquires each
  product's fair `ReentrantLock` in that order — never cart-insertion order — the same idiom
  `digitalwallet.command.TransferCommand` uses for two-account transfers, generalized to N
  products. `ShoppingCartConcurrencyTest` proves it empirically: two users' carts touch the same
  two products in *opposite* insertion order, and concurrently checking both out (via
  `CountDownLatch`-synchronized threads, not sleeps) completes every time rather than deadlocking,
  across 50 repeated rounds. `Product#stockQuantity` is additionally an `AtomicInteger` with a CAS
  `decrementStock`, so stock can never go negative even if the coarse lock discipline were ever
  bypassed.
- **Idempotency cache (real bug found and fixed here too)**: `idempotencyCache: Map<String, Order>`
  is checked before any locking; a retried `placeOrder()` call with the same key returns the
  identical cached `Order` with no re-validation, no second stock decrement and no second payment
  call. This was true only for *sequential* retries before this pass — the check-then-act
  (`idempotencyCache.get()` ... full checkout ... `idempotencyCache.put()`) was not atomic, so two
  concurrent retries sharing the same key could both observe a cache miss and both run the
  checkout, double-charging and double-decrementing stock, with the cache silently keeping only the
  last writer's `Order`. `ShoppingCartConcurrencyTest#concurrentRetriesWithSameIdempotencyKeyStillChargeExactlyOnce`
  (12 `CountDownLatch`-released threads racing the same key) caught this on its first run. Fixed by
  a lazily-created per-key lock (`idempotencyKeyLocks: Map<String, Object>`) wrapping the whole
  check→checkout→cache-put sequence, and by computing the order total from the just-decremented
  `orderItems` snapshot rather than re-reading the live, unlocked `Cart` object. See RCA-033.
- Exception hierarchy: `ShoppingCartException` (abstract, `extends com.lld.config.DomainException`,
  new in this pass — the 5 concrete exceptions previously extended `RuntimeException` directly)
  with `ProductNotFoundException` (404), `CartEmptyException`/`InvalidOrderStateException` (400),
  `InsufficientStockException` (409), `PaymentFailedException` (422). Never maps to 5xx —
  `DomainExceptionContractTest`/`GlobalExceptionHandlerTest` enforce it.
- Lombok models: `CartItem`/`OrderItem`/`User` are `@Data @Builder @AllArgsConstructor` (the
  generated constructor's signature already matched every existing call site, so no call sites
  needed to change). `Order` is `@Data @Builder` with its defaulting 5-arg constructor kept
  hand-written (status starts `PLACED`, `createdAtEpoch` stamped at construction) plus a separate
  `@AllArgsConstructor` purely so `@Builder` has a full-fields constructor to call internally.
  `Product` and `Cart` are `@Getter`-only (not `@Data`/`@Builder`) — matching
  `com.lld.atm.model.Account`'s precedent — because `Product` holds a `ReentrantLock`
  (`@Getter(AccessLevel.NONE)` + hand-written `@JsonIgnore getLock()`, and the same treatment for
  the `AtomicInteger` stock field) and `Cart`'s single-arg constructor doubles as the `Cart::new`
  method reference passed to `Map#computeIfAbsent`.
- Isolated `/api/shoppingcart/sim/*` engine: a second, independent set of
  `products`/`carts`/`orders` maps (`simProducts`/`simCarts`/`simOrders`) plus its own event log,
  reset by `initSimState()` — proven never to leak into or read from live state by
  `ShoppingCartSimEngineTest`. `simPlaceOrder` now also logs a `LOCK_ORDER` event (cart-insertion
  order vs. the actual ascending lock-acquisition order) whenever a checkout touches more than one
  product, so the simulation UI can visualize the exact mechanic `placeOrder()` uses.
- Tests (5 classes): `ShoppingCartServiceTest` (existing — command/undo, successful order,
  idempotent retry, guarded state transitions, 10-thread single-product oversell protection),
  `ShoppingCartConcurrencyTest` (new — the opposite-insertion-order deadlock-freedom proof across
  50 rounds, plus sequential and concurrent idempotency double-charge/double-decrement checks),
  `command.CartCommandTest` (new — direct execute()/undo() unit tests for all three commands,
  including the `UpdateQuantityCommand` drop-to-zero fix), `payment.ShoppingCartPaymentProcessorTest`
  (new — all four strategies resolve correctly, `PaymentFailedException` is provoked via a partial
  strategy list), `ShoppingCartSimEngineTest` (new — sandbox isolation, reset-to-seed, lock-order
  event content). No dedicated repository test class: state lives directly in
  `ShoppingCartService`'s own `ConcurrentHashMap`s rather than behind a separate repository class,
  so there's no independent repository behavior to test beyond what the service tests already
  cover.

### Frontend
- 8 tabs: Shop Catalog, Cart & Checkout with Undo, Orders Timeline, Seller Dashboard, Interactive
  Simulation, Class Diagram, Sequence Diagram, Design Details.
- Simulation tab rebuilt as an 8-step, user-driven walkthrough (no autoplay timers) against the
  isolated `/api/shoppingcart/sim/*` sandbox, using the shared `StepIndicator` component: reset the
  sandbox, two shoppers contend for a 2-unit low-stock product, the second shopper's checkout is
  rejected safely, a multi-product checkout visualizes cart-insertion order vs. the actual
  ascending lock-acquisition order (chip-sequence diagram), an order is shipped, then a cancel
  attempt on the now-shipped order is rejected by the guarded state machine. A live telemetry HUD
  (tracked product stock, per-shopper cart item counts, orders placed, events logged, tracked
  order status), per-shopper cart panels, a warehouse stock grid, and a reverse-chronological event
  log all render straight from each step's real API response.
- **`usePolling` added (RCA-044 follow-up)**: the catalog polls every 6s so another shopper's order
  decrementing stock shows up without a manual refresh — stock, not the current user's own cart, is
  the shared state this closes the gap on.

## Pub Sub System Module
### Backend
Audited from HANDOFF.md's "unverified" list rather than built from scratch — the module already had
`exception/`, a `worker/SubscriberWorker`, three `Subscriber` implementations and `SimEvent`/
`*Snapshot` models, and the machinery turned out to be genuinely real (a live `SubscriberWorker` is
an actual daemon `Thread`, not just a class name), just unproven: 1 test file, two of the three
exceptions never thrown anywhere, and a `PubSubRepository` that was never even wired into the
service. Hardened to the reference bar without changing the dispatch model.
- **Exception hierarchy, completed** — `PubSubException` (new, abstract) `extends com.lld.config.DomainException`; `TopicNotFoundException` (404) and `QueueFullException` (409) now extend it instead of bare `RuntimeException`. `QueueFullException` was dead code — nothing in the codebase ever threw it, since broadcast `publish()` reports a full queue as a rejected-id list, never an exception. `DispatchFailedException` was *also* dead code and, worse, `@ResponseStatus(INTERNAL_SERVER_ERROR)` — a 5xx `DomainException` `DomainExceptionContractTest` would have caught the moment it was ever thrown; recast to 410 (`GONE`, the subscriber that would have received the message is simply gone). Both are now real: a new strict, single-target `Broker#publishToSubscriber` / `Topic#publishToOne` / `SubscriberWorker#enqueueOrThrow` path throws `QueueFullException` when that one subscriber's queue is momentarily full and `DispatchFailedException` when its worker has already stopped — distinct from broadcast `publish()`'s reject-and-continue contract, which is unchanged and still never throws for a full queue. Two more cases the service silently allowed before are now typed: `SubscriberNotFoundException` (404 — unsubscribing, direct-sending to, or reading message history for an id not registered on that topic) and `DuplicateSubscriptionException` (409 — re-subscribing an already-active (topic, id) pair used to silently replace the worker and drop its in-flight queue/counters with no warning; now rejected, caller must unsubscribe first).
- **`PubSubRepository`, wired in for real** — it existed but was never `@Autowired` or referenced anywhere; `PubSubService` managed its own bare, unsynchronized `HashMap<String, Subscriber>` instead (a real thread-safety bug under concurrent subscribe/unsubscribe). Rewritten keyed by `(topicName, subscriberId)` composite key rather than subscriber id alone — fixing a second real bug where the same subscriber id active on two different topics clobbered a single id-keyed map entry, so `getSubscriberMessages` could return the wrong topic's history. Backed by `ConcurrentHashMap`, now the actual backing store behind `subscribe`/`unsubscribe`/`getSubscriberMessages`; the isolated `/sim/*` engine gets its own separate `PubSubRepository` instance, same isolation shape as its separate `Broker`.
- **Cross-topic message-history bug, fixed**: `getSubscriberMessages(topicName, subscriberId)` used to look the subscriber up by id alone, ignoring `topicName` entirely — passing any topic name for a subscriber id registered on a *different* topic silently returned that other topic's history instead of a 404. Now validates via `Topic#hasSubscriber` and throws `SubscriberNotFoundException`; `PubSubServiceTest#getSubscriberMessages_subscriberOfADifferentTopic_throwsSubscriberNotFoundException` pins it down.
- **Lombok models**: `Message`, `SimEvent`, `SubscriberSnapshot`, `TopicSnapshot` — plain value carriers with no invariants — converted to `@Data @Builder @NoArgsConstructor @AllArgsConstructor`, matching `inventory.model.Product`'s shape; `Message.of(...)` replaces the old ad-hoc constructor and stamps `timestampEpoch`, same idiom as `elevator.model.Request#of`. `Broker`/`Topic`/`SubscriberWorker` stay hand-written — real invariants (live threads, bounded queues, the duplicate/not-found guards) that Lombok-generated setters would bypass.
- **Concurrency, proven with real threads and latches, not sleeps**: `PubSubConcurrencyTest` — M publishers x N subscribers all fired through a shared `CountDownLatch`, every subscriber receives every published message exactly once (no loss, no duplication, verified by exact payload-set equality per subscriber); a subscriber gated permanently inside `consume()` (deterministic stand-in for "can't keep up") never blocks a fast subscriber's delivery on the same topic, since each has its own worker thread; the bounded-queue backpressure path is deterministically provoked (not raced against a timer) by first waiting on a latch for the worker to actually dequeue into its blocked `consume()`, then filling the now-empty queue to exactly capacity and asserting the next publish is the one rejected. `SubscriberWorkerTest` (new unit-test flavor) proves `SubscriberWorker` really dispatches on its own named thread (`Thread.currentThread().getName()` inside `consume()` differs from the caller's), FIFO ordering, `enqueue`/`enqueueOrThrow`'s two distinct failure modes, and that `stopGracefully()` still drains whatever was already queued before the thread exits. `PubSubRepositoryTest` (new) covers the repository's real independent behavior — composite-key isolation across topics and lost-update-free concurrent saves — since it is no longer a bare wrapper.
- Isolated `/api/pubsub/sim/*` engine (pre-existing, kept and hardened): its own `Broker` + `PubSubRepository` pair, seeded with `tech-news`/`sports-alerts` and a fast/slow(capacity=3)/logging subscriber, so the demo can never touch `PubSubInitializer`'s live topics. New `simPublishToSubscriber` / `POST /sim/publish-direct` mirrors the real strict send but catches `QueueFullException`/`DispatchFailedException`/`SubscriberNotFoundException` server-side and logs a `DIRECT_SEND_REJECTED` sim event instead of letting them escape as HTTP errors, so the simulation tab can show the strict-send failure modes without special-casing an error response.

### Frontend
- 6 tabs: Topics & Publishers, Subscribers & Inboxes, Interactive 2D Simulation, Sequence Diagram, Class Diagram, Design Details — rebuilt on the shared `LldPage` shell (the previous page hand-rolled its own tab bar and header).
- 8-step guided simulation against `/api/pubsub/sim/*`: reset the sandbox, view the seeded topics/subscribers, subscribe a new consumer, publish a single message and watch the broadcast fan-out pulse, rapid-burst-publish to provoke real backpressure, a direct/strict send that surfaces `QueueFullException`/`DispatchFailedException` live in the event log, unsubscribe a consumer, and a final telemetry review — plus a live HUD (topics, subscribers, delivered/rejected totals, events logged) and a broker-hub visualization with per-subscriber queue-fill bars that pulse on the topic that just received traffic.
- New sequence diagram (`data/sequences/pubsub.js`): a burst of publishes to a topic with one fast and one permanently-stuck subscriber, showing why the fast one keeps receiving on time while the slow one's bounded queue fills and starts rejecting — grounded in `PubSubConcurrencyTest`.

## ATM Module
### Backend
Raised from a partially-real module (real dispenser strategy and exceptions, but a bare `ATMState`
enum with no transition enforcement, a monolithic `BankingService`, and only one test file) to the
reference bar — same audit-and-harden shape as pubsub/parkinglot.
- `AtmInitializer`: seeds sample accounts, card credentials (John Doe = 1234, Jane Smith = 4321,
  Alice Johnson = 0000), and initial cash dispenser note inventory.
- **State Pattern (hardened)**: `com.lld.atm.state` — one class per `ATMState`
  (`IdleSessionState`, `CardInsertedSessionState`, `AuthenticatedSessionState`,
  `TransactionInProgressSessionState`, `DispensingSessionState`, `SessionEndedSessionState`,
  `CardBlockedSessionState`), each declaring a `Set<ATMState> allowedNext()` — the same
  declared-set-of-legal-next-states shape as `taskmanagement.state.TaskState` (a session can fan
  out, e.g. `AUTHENTICATED` may move to `TRANSACTION_IN_PROGRESS` or straight to `SESSION_ENDED`
  on eject-without-transacting). `AtmService#transitionTo(ATMState)` is the single enforcement
  point; every session-mutating method routes through it, and it throws
  `InvalidSessionStateException` (409) for anything not in `allowedNext()`.
- **Per-Account Lock (the concurrency centerpiece)**: a fair `ReentrantLock` per `Account`
  (`accountLock`, `@Getter(AccessLevel.NONE)` + `@JsonIgnore getLock()` so it never leaks into
  `equals`/`hashCode`/JSON responses — the same hand-rolled-lock-field precedent as
  `library.model.Member`/`stockbroker.model.Account`), guarding withdraw/deposit end to end so two
  concurrent withdrawals against the same account can never both succeed past the balance.
  `AtmConcurrencyTest` proves it: 10 concurrent withdrawals on one account — exactly one succeeds,
  no overdraw, and the transaction log records exactly one success entry; a separate cassette-level
  test proves concurrent dispense requests never dispense more notes than the cassette holds.
- **Strategy + Factory (Denomination Dispensing)**: `DenominationDispenseStrategy` —
  `GreedyDenominationDispenseStrategy` (`MINIMIZE_NOTES` — fewest notes possible) and
  `ConserveLargeNotesDispenseStrategy` (`CONSERVE_LARGE_NOTES` — prefers smaller denominations,
  preserving the cassette's large-note supply for later withdrawals) — resolved by
  `DenominationDispenseStrategyFactory` via an `EnumMap`, the same shape as
  `inventory.strategy.ReorderStrategyFactory`. `CashDispenser` never branches on the mode itself.
- **`BankingRepository` (new)**: replaces the old monolithic `BankingService` — a
  `ConcurrentHashMap`-backed store for accounts/cards, the single source of truth both the live
  session flow and the isolated sim sandbox read/write.
- Exception hierarchy: `AtmException` (abstract) `extends com.lld.config.DomainException` with
  `AccountNotFoundException`/`CardBlockedException` (404/403), `AuthenticationFailedException`
  (401 — wired to a real 3-attempt PIN lockout that flips the card to `CardBlockedSessionState`),
  `InsufficientBalanceException`/`InsufficientCashException` (409), `InvalidSessionStateException`
  (409, the state machine's own rejection). Never maps to 5xx —
  `DomainExceptionContractTest`/`GlobalExceptionHandlerTest` enforce it.
- Isolated `/api/atm/sim/*` engine: a second `BankingRepository` + `CashDispenser` pair, rebuilt on
  every `simReset()`, driving the same state machine and dispense strategies as the live terminal.
- Tests (4 classes): `AtmServiceTest` (session lifecycle, PIN lockout, deposit/withdraw, sim
  isolation), `AtmConcurrencyTest` (the load-bearing suite above), plus dispenser-strategy and
  repository test classes. `BankingRepository` is exercised directly (not merged into the service
  test) since it owns real independent behavior (id generation, card/account lookups) beyond a bare
  id/save/get wrapper.

### Frontend
- Rebuilt onto the shared `LldPage` shell with a live terminal (PIN entry, cash-slot animation,
  note-breakdown badges) plus an 8-step interactive simulation tab against the isolated
  `/api/atm/sim/*` sandbox with a live telemetry HUD, driving the real state machine, dispense
  strategies and account-lock race instead of a client-only animation.

## LinkedIn Module
### Backend
Audited from HANDOFF.md's "unverified" list — the same structural shape as library (a dead
`getInstance()` singleton next to real Spring DI, no `repository/` package, non-Lombok models,
only one test file), plus a wiring gap of its own: the two search strategies and both notification
observers were `@Component` beans that the service never actually received — it called `new
WeightedUserSearchStrategy()` etc. directly from a no-arg constructor instead of being
constructor-injected, so the real Spring-managed beans of those exact types sat in the context
unused.
- **New `LinkedInRepository`** (`com.lld.linkedin.repository`) — the user/connection/message/job
  `ConcurrentHashMap`s, extracted out of `LinkedInService` wholesale. Deliberately keeps
  `connectionLocks` out of the repository — the canonical `min(u1,u2) + "#" + max(u1,u2)` pair
  locking behind `sendConnectionRequest` stays a service-level concern, the same split
  `tictactoe.service.TicTacToeService`'s `gameLocks` keeps outside `GameRepository`. The isolated
  `/sim/*` engine now runs on a second, fully independent `LinkedInRepository` instance instead of
  six parallel `simXxx` maps, matching `movieticket.service.MovieTicketService`'s shape.
- **Dead `getInstance()` singleton removed** — confirmed nothing in the app, tests, or frontend
  ever called it.
- **Dependency injection fixed** — `LinkedInService`'s constructor now takes `LinkedInRepository`,
  `UserSearchRankingStrategy`, `JobSearchRankingStrategy`, `InAppNotificationObserver`, and
  `LoggingNotificationObserver` as real Spring-injected collaborators, the same shape
  `library.service.LibraryService` already used for `FineStrategy`/`DueDateNotifier`. Also removed
  a genuinely dead code path found in the process: `getNotifications(userId)` used to read its own
  separate `notificationsByUser` map instead of the `InAppNotificationObserver` every notification
  was already being dispatched to — meaning that observer's own `getNotificationsForUser` method
  was unreachable. `getNotifications` now delegates to the observer directly (the same shape
  `library.service.LibraryService#getNotificationsForMember` already used), and the redundant map
  is gone.
- Concurrency & Graph Safety: `ConcurrentHashMap` repository + canonical pair locking (`min(u1, u2) + "#" + max(u1, u2)`) preventing connection request race conditions — now proven with real threads (see Tests below), not just sequential calls.
- Strategy Pattern: `UserSearchRankingStrategy` (weighted 4-factor scoring: name, headline, skills, network degree) and `JobSearchRankingStrategy` (weighted 4-factor scoring: title, skill overlap, location, recency) — both now actually constructor-injected rather than hardcoded.
- Observer Pattern: `NotificationObserver` interface with `InAppNotificationObserver` and `LoggingNotificationObserver` for asynchronous event dispatching.
- Direct Messaging Guard: Enforces 1st-degree `ACCEPTED` connection status prior to message transmission.
- Lombok (`@Getter`, `@Setter` where a plain setter already existed) across all 10 model classes.
  Custom-logic setters (`User#setName`, `Profile#setHeadline/setSummary/setLocation`,
  `Connection#setStatus`, `Experience#setCurrent`) and collection-view getters
  (`Profile#getExperiences/getEducations/getSkills`, `JobPosting#getRequiredSkills/getApplicants`)
  kept hand-written alongside the generated accessors.
- **Class diagram and design docs were entirely fabricated (RCA-036)** — both files described a
  fictional `Post`/`Comment`/`FeedService`/`NotificationService`/`FeedRankingStrategy` social-feed
  clone with no basis in the real code at all. Rewritten from scratch grounded in the actual
  `User`/`Profile`/`Connection`/`Message`/`JobPosting` domain; the sequence diagram was already
  accurate and untouched.

### Frontend
- 6 tabs: 👤 My Profile & Network, 💼 Jobs & Applications, 💬 Messaging & Inboxes, 🕹️ Interactive 2D Simulation, 📐 Class Diagram, 📋 Design Details.
- Real-time profile skill editor, 1-click job application with match scoring, live direct chat bubble feed, and 4-node interactive simulation sandbox with visual network topology map and real-time telemetry event stream.
- `api.js`'s raw `fetch()` calls were converted to the shared `apiFetch` wrapper (this also fixed a
  real bug: the old local `handleResponse` only read `err.message`, never `err.error`, so every
  backend error — which uses the shared `ErrorResponse.error` field — silently showed a generic
  "API request failed"). The page's previously-hardcoded dark-theme colors were fixed to read
  `theme.css` tokens (RCA-037).
- **`usePolling` added (RCA-044 follow-up)**: pending connection requests/notifications/connections
  poll every 5s while a user is selected, and an open conversation polls every 3s like a live chat
  — closing the "no polling loop" gap this section previously documented as not applying here.

### Tests (1 file -> 4)
`LinkedInServiceTest` (pre-existing, kept — registration/login, profile management, connection
workflow, messaging security, job posting/application, search relevance, sim engine),
`LinkedInRepositoryTest` (new — storage behaviour, `claimEmail`/`addJobApplicant` atomicity
contracts), `LinkedInStrategyTest` (new — both weighted strategies' scoring math term-by-term),
`LinkedInConcurrencyTest` (new, real threads: N racers sending a connection request from either
direction to the same pair — exactly one wins; N racers registering with the same email — exactly
one wins; N racers applying to the same job as the same candidate — exactly one wins; distinct
candidates applying concurrently all succeed).

## Library Management Module
### Backend
Audited from HANDOFF.md's "unverified" list — Strategy/Factory/Observer were already genuinely
wired up (unlike movieticket's dead-code versions of the same patterns), so this pass's real gaps
were structural: no `repository/` package (12 maps sitting directly on the service), a dead legacy
`getInstance()` singleton alongside proper Spring DI, non-Lombok models, and only one test file
whose only "concurrency" test called `borrowBook` twice sequentially — no window for a real race.
- **`LibraryRepository` (new)** — `com.lld.library.repository`: the book/copy/member/loan
  `ConcurrentHashMap`s and both `AtomicLong` id generators, extracted out of `LibraryService`
  wholesale. Deliberately does NOT hold the per-book `ReentrantLock`s — locking stays a
  service-level concern coordinating a read-validate-mutate span across the repository, the same
  split `tictactoe.service.TicTacToeService`'s `gameLocks` keeps outside `GameRepository`. The
  isolated `/sim/*` engine now runs on a second, fully independent `LibraryRepository` instance
  instead of six parallel `simXxx` maps — the same two-instance shape
  `movieticket.service.MovieTicketService` uses.
- **Dead `getInstance()` singleton removed** — a manual double-checked-locking
  `public static LibraryService getInstance()` sat alongside the real Spring `@Service` bean with
  constructor injection; nothing in the app, tests, or frontend ever called it. `LibraryService` is
  a Spring-managed singleton the ordinary way — no manual singleton machinery needed.
- Concurrency & Double-Borrow Prevention: per-book `ReentrantLock` (fair, keyed by ISBN) preventing
  last-copy race conditions and a per-member `ReentrantLock` guarding borrow-limit oversubscription
  — both proven with real threads now (see Tests below), not just a sequential double-call.
- Factory Pattern: `MemberFactory` instantiating `STUDENT` (3 books / 14 days), `FACULTY` (10 books / 30 days), and `GENERAL` (5 books / 21 days) members with encapsulated `LoanPolicy`.
- Strategy Pattern: `FineStrategy` interface with `StandardFineStrategy` calculating daily overdue late fees upon return.
- Observer Pattern: `DueDateNotifier` broadcasting reminder events and overdue transition alerts to `LibraryNotificationObserver` instances via `@Scheduled` sweeps.
- Custom Exceptions: `BookNotAvailableException` (409), `BorrowLimitExceededException` (409), `MemberNotFoundException` (404), `LoanNotFoundException` (404), `InvalidReturnException` (400) — already correctly on the shared `DomainException` contract going into this pass (unlike movieticket's RCA-035 gap).
- Lombok (`@Getter`, `Loan` also `@Setter` on its three mutable fields) across all 6 model classes.
  `Book#getCopies()` (unmodifiable-view wrapper), `BookCopy#isAvailable/setAvailable` (kept
  hand-written to avoid relying on Lombok's boolean-getter naming for a field already named
  `isAvailable`), and `Member`'s `activeLoanCount`/`memberLock` accessors (an `AtomicInteger`
  derived-int getter and a lock getter with a different method name than Lombok would generate)
  stay hand-written alongside the generated accessors — the same `@Getter(AccessLevel.NONE)`
  exclusion `atm.model.Account` uses, which was itself modeled on this class.
- Tests (1 file -> 4): `LibraryServiceTest` (pre-existing, kept — catalog/member registration,
  borrow/return happy path, the original sequential last-copy-race check, borrow-limit rejection,
  fine payment, scheduled sweep, sim engine), `LibraryRepositoryTest` (new — storage behaviour,
  `getOrCreateBook` idempotency, id-generator resets), `LibraryStrategyTest` (new —
  `StandardFineStrategy`'s day-count math and `MemberFactory`'s type-to-policy resolution),
  `LibraryConcurrencyTest` (new, real threads: N racers for one copy — exactly one wins; N racers
  against a 5-book limit — exactly 5 succeed; 20 concurrent fine payments — the balance lands
  exactly where the sum predicts, no lost update).

### Frontend
- 6 tabs: 📚 Book Catalog & Borrow, 👤 Member Dashboard & Active Loans, 🔔 Notifications & Alerts, 🕹️ Concurrency & Loan Simulation, 📐 Class Diagram, 📋 Design Details.
- Live searchable catalog with rack locations and copy availability chips, member active loan manager with due date countdown badges, accrued fine settlement, and interactive 2D simulation visualizer for last-copy races and accelerated sweep events.
- `api.js`'s raw `fetch()` calls were converted to the shared `apiFetch` wrapper (this also fixed a
  real bug: the old local `handleResponse` only read `err.message`, never `err.error`, so every
  backend error — which uses the shared `ErrorResponse.error` field — silently showed a generic
  "API request failed"). The page's previously-hardcoded dark-theme colors were fixed to read
  `theme.css` tokens (RCA-037).
- **`usePolling` added (RCA-044 follow-up)**: book availability polls every 6s (skipped while a
  search filter is active, so a background refresh can't silently clobber search results back to
  the full catalog) and the selected member's notifications poll every 6s — closing the "no polling
  loop" gap this section previously documented as not applying here.

## Airline Management Module
### Backend
- `AirlineService`: Facade managing aircraft/flight schedules, seat inventories, multi-passenger bookings, and fare-aware cancellation refunds. Live state lives in `AirlineRepository` (a bare `ConcurrentHashMap` CRUD layer, matching `MovieTicketRepository`/`ConcertTicketRepository`'s shape); the isolated `/sim/*` sandbox keeps its own inline maps in the service since it always seeds one fixed demo flight rather than an open catalog.
- Concurrency & Deadlock Prevention: `SeatLockManager` using per-seat `ReentrantLock` (`flightId:seatNumber`) with an explicit ascending-seat-number lock-ordering comment, fair-lock construction, and a 5-minute hold TTL swept by a `@Scheduled` background cleanup. `AirlineConcurrencyTest` proves it with real threads/latches: exactly one of N racers wins a contested `holdSeats`/`bookFlight`, disjoint seats all succeed in parallel, and a reversed-order two-seat request from two threads resolves without deadlock.
- State Machine Pattern: `SeatStatus` (`AVAILABLE` ➔ `HELD` ➔ `BOOKED`) and `BookingStatus` (`PENDING` ➔ `CONFIRMED` ➔ `CANCELLED` / `REFUNDED`).
- Strategy + Factory Pattern (two independent families, both `EnumMap`-resolved like `inventory.strategy.ReorderStrategyFactory`): `PricingStrategyFactory` resolves `PricingModel` (`STANDARD` flat per-class fare via `ClassBasedPricingStrategy`, `DEMAND_SURGE` — same base fare scaled up inside the 14-day/3-day departure windows — via `DemandSurgePricingStrategy`) and is the sole source of a `Seat`'s `basePrice`, set once in `Flight.create(...)`; `RefundPolicyFactory` resolves a `Booking`'s `FareType` (`FLEXIBLE` ➔ `TieredCancellationRefundPolicy` — 100% ≥24h, 50% 24h–2h, 0% <2h; `BASIC` ➔ `NonRefundableFarePolicy` — always ₹0) at `cancelBooking()` time.
- Overbooking guard: `holdSeats` refuses an already-HELD/BOOKED seat outright; `confirmSeats` refuses (without mutating) a seat someone else already `BOOKED` — see RCA-024, a real bug this audit found where that branch used to reset an already-booked seat back to `AVAILABLE` and misreport it as an expired hold.
- Lombok models throughout (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`, matching `com.lld.inventory.model`): `Flight.create(...)` and `Aircraft.of(...)` are static factories layered on top of the generated builder for the seat-materialization/defensive-copy logic a plain builder can't express.
- Custom Exceptions: `SeatNotAvailableException` (409), `HoldExpiredException` (410), `BookingFailedException` (422), `InvalidCancellationException` (400), `FlightNotFoundException` (404).
- Tests: `AirlineServiceTest` (booking/cancellation workflow, overbooking rejection, pricing-strategy and fare-type wiring, sim engine), `AirlineConcurrencyTest` (contested-seat hold/booking races, disjoint-seat parallelism, reversed multi-seat lock order), `strategy/PricingStrategyFactoryTest`, `strategy/RefundPolicyFactoryTest`, `repository/AirlineRepositoryTest`.

### Frontend
- 6 tabs: 🛫 Flight Search & Seat Map, 🎫 My Bookings & Refunds, 🕹️ Concurrency Simulation, 📐 Class Diagram, 🔀 Sequence Diagram, 📋 Design Details.
- Interactive 2D aircraft cabin layout with seat classes, window/aisle indicators, hold countdown timer (`⏱ 04:59`), multi-passenger booking checkout with a FLEXIBLE/BASIC fare selector, and an 8-step guided simulation walkthrough (reset → view seeded cabin → hold → collision → FLEXIBLE booking → BASIC booking → fare-aware cancellation comparison → TTL expiry) with a live telemetry HUD (available/held/booked seat counts, collisions blocked, total events, last event) plus the underlying manual sandbox controls for free-form experimentation.
- **`usePolling` added (RCA-044 follow-up)**: the selected flight's seat map polls every 4s so another customer's hold/booking shows up without a manual refresh — mirrors `movieticket`/`concert-ticket`'s seat-map polling.

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
Audited against the 17-criteria bar (it was already the most mature "unverified" module — real
Strategy/Factory/Observer patterns and a typed exception hierarchy existed going in) and raised the
remaining gaps: one dead exception, no `OrderExecutionStrategyFactory`, hand-written getters
throughout the model package, a vestigial static-singleton `getInstance()` nobody called, and only
one test file.
- `StockBrokerService`: Spring-managed facade over stocks, accounts, order books and order
  matching. The vestigial `getInstance()` double-checked-locking singleton (dead code — Spring
  already manages it as a bean, and nothing called the static accessor) was removed.
- **Order Book Pattern**: `OrderBook` — dual `TreeMap` price-time priority ladder (`bids`
  descending, `asks` ascending) with a FIFO `Queue<Order>` per price level. `OrderBookTest` covers
  it directly (price ordering, empty-level cleanup on `removeOrder`, depth-snapshot aggregation,
  spread calculation) since it owns real independent behaviour, not bare wrapper plumbing.
- **Strategy + Factory (new)**: `OrderExecutionStrategy` — `MarketExecutionStrategy` (walks the
  book immediately) and `LimitExecutionStrategy` (matches at-or-better than the limit, rests the
  remainder) — now resolved via `OrderExecutionStrategyFactory`'s `EnumMap<OrderType,
  OrderExecutionStrategy>`, the same shape as `inventory.strategy.ReorderStrategyFactory`, instead
  of `StockBrokerService#placeOrder` branching on `OrderType` itself. `OrderFactory` is the
  separate, genuine Factory Method for `BuyOrder`/`SellOrder` — it always existed and was already
  correct, just previously undocumented as distinct from the execution-strategy resolution.
- **Self-trade prevention (new, the exception hierarchy's missing piece)**: a `default
  guardSelfTrade(order, book)` method on `OrderExecutionStrategy` — called at the top of both
  strategies' `execute()` — rejects an order with `OrderExecutionException` (422) if the best
  available counter-price on the opposite side of the book belongs to the SAME account (Cancel-
  Newest policy). This was `OrderExecutionException`'s real gap: it existed in the hierarchy but
  was never thrown anywhere. It's a top-of-book check only (real matching-engine "inside market"
  fast path), so a self-order resting deeper in the book still matches normally.
  `StockBrokerService#placeOrder`/`#simPlaceOrder` catch it, release the pre-check reservation
  (which would otherwise leak — a real bug this pass found and fixed, since nothing previously
  released a BUY's reserved funds or a SELL's reserved shares if execution rejected the order after
  the reservation had already succeeded) and mark the order `REJECTED` before rethrowing/logging.
- **Concurrency (the module's real interesting story, now proven with real threads)**: order
  placement pre-reserves funds/shares under `Account`'s own fair `ReentrantLock`
  (`reserveFunds`/`Portfolio#reserveShares`, which delegates to a `Holding`-level lock one notch
  finer) BEFORE the per-symbol `ReentrantLock` (`symbolLocks`, lazily created via
  `computeIfAbsent`) serializes the actual order-book matching — the two locks are never held
  nested (each is acquired, used, and released before the next is taken), so lock-ordering deadlock
  is structurally impossible rather than merely avoided by convention.
  `StockBrokerConcurrencyTest` proves it with real threads/latches (not sleeps): (a) N concurrent
  BUY orders against one account never reserve more cash than its balance affords; (b) N concurrent
  SELL orders never reserve more shares than the account holds; (c) many buyers racing one large
  resting SELL order never double-execute the same shares — the matched quantity always sums to
  exactly the resting order's size.
- Exception hierarchy: `StockBrokerException` (abstract) `extends com.lld.config.DomainException`,
  with `InsufficientFundsException`/`InsufficientStockException`/`InvalidOrderException` (400),
  `AccountNotFoundException`/`StockNotFoundException` (404), `OrderExecutionException` (422 — see
  self-trade prevention above). All six are genuinely provokable now; none maps to 5xx.
- Lombok models (new): `Account`, `Holding`, `Order`(abstract)/`BuyOrder`/`SellOrder`, `Portfolio`,
  `Stock`, `Trade`, `User`, `SimEvent` all use `@Getter`/`@Builder` (not `@Data` on anything holding
  a lock or atomic-composed business logic). `Account` gets the exact `atm.model.Account` /
  `library.model.Member` treatment — `@Getter` only, `@Getter(AccessLevel.NONE)` +
  `@Builder.Default` on `accountLock`, a hand-written `@JsonIgnore getLock()` — because this was
  the ORIGINAL hand-rolled precedent those two modules' docstrings cite as having copied.
  `Holding` dropped its redundant `AtomicInteger` fields for plain `int`s, since its own
  `synchronized` mutators already serialize every read-modify-write. Static factories
  (`Account.open(...)`, `Portfolio.empty(...)`, `Holding.of(...)`, `User.of(...)`) layer
  construction-time normalization (clamped initial deposit, trimmed name/email) on top of the
  generated builder, the same pattern `Flight.create(...)`/`Aircraft.of(...)` use in `airline`.
- Isolated `/api/stockbroker/sim/*` engine: already existed and was genuinely isolated (separate
  `simStocks`/`simAccounts`/`simOrderBooks`/`simOrdersById` maps, rebuilt from scratch on
  `simReset()`, seeded with 2 demo traders and a 4-level INFY bid/ask ladder) — audited and
  confirmed real, no changes needed beyond wiring the new strategy factory and the self-trade
  reservation-release fix through `simPlaceOrder` too.
- Tests (grew from 1 file to 7): `StockBrokerServiceTest` (existing coverage plus self-trade
  rejection + reservation release, cross-account matching still works normally),
  `OrderBookTest` (the repository-equivalent test — ladder ordering, level cleanup, depth/spread),
  `OrderFactoryTest`, `OrderExecutionStrategyFactoryTest`, `LimitExecutionStrategyTest` /
  `MarketExecutionStrategyTest` (maker-price priority, partial fills, self-trade guard, in
  isolation from the service's locking), `StockBrokerConcurrencyTest` (the load-bearing suite
  above).

### Frontend
Rebuilt onto the shared `LldPage` shell — the previous page rendered `ClassDiagram`/
`SequenceDiagram`/`DesignDetails` directly instead of using it, and hardcoded a dark-only palette
(`#0f172a`/`#1e293b`/`#334155`) that ignored the theme toggle entirely. `api.js` now wraps the
shared `apiFetch` (it previously hand-rolled its own `fetch`/error handling).
- Tabs: 📈 App (live trading console), 🕹️ Interactive Simulation, Class Diagram, Sequence Diagram,
  Design Details.
- App tab: live quote ticker, order placement console (BUY/SELL × MARKET/LIMIT), account switcher
  (Alice/Bob), live order-book depth ladder with cumulative volume, portfolio holdings table, and
  cancellable recent-orders list — every value comes from a real `/api/stockbroker/*` call, nothing
  mocked.
- 8-step Interactive Simulation against the isolated `/api/stockbroker/sim/*` sandbox with a live
  telemetry HUD (INFY price, bid/ask spread, resting-order count, self-trade blocks, events
  logged): reset → view the seeded traders and 4-level ladder → rest a LIMIT order → sweep the book
  with a MARKET order → attempt a self-trade (genuinely rejected by the real guard) → attempt an
  over-budget order (genuinely rejected by `InsufficientFundsException`) → cancel a resting order
  → review the full event log.
- New sequence diagram (`data/sequences/stock-brokerage.js`) walks two buyers racing to match the
  SAME resting sell order under the per-symbol lock, step by step, through
  `StockBrokerConcurrencyTest#concurrentMatchingNeverDoubleFillsSameRestingOrder` — the previous
  sequence file (added in the RCA-030 bulk push) invented an entire architecture
  (`BrokerageService`, `MatchingEngine`, `checkAndBlockFunds`, `TradeResult`, a `/api/stock-broker/`
  path) that doesn't exist in the real code; it read as "checked out clean" against RCA-030's own
  diagnostic grep only because its participant labels embedded `\n` mid-name, splitting matched
  class-name patterns across lines and evading the regex.

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

## Music Streaming Module
### Backend
- `MusicStreamingInitializer`: 4 artists (The Weeknd, Dua Lipa, Mozart, Kendrick Lamar), 4 albums, 10 songs across POP/ELECTRONIC/CLASSICAL/HIP_HOP, and 3 demo users — Alice (`FREE`), Bob (`PREMIUM`), Carol (`FAMILY`) — with a couple of seeded playlists.
- `MusicStreamingService`: facade over catalog browsing, `search`, playlist CRUD (`createPlaylist`, `addSongToPlaylist`, `removeSongFromPlaylist`, `reorderPlaylist`), `likeSong`/`unlikeSong`, `downloadSong`, `changeSubscription`, `getRecommendations`, plus isolated sim methods (`simPlay`, `simStop`, `simSkip`, `simLike`, `simDownload`, `simChangeSubscription`, `simRace`) against a second `MusicStreamingRepository` — same shape as Splitwise's `simRepository`.
- **Strategy + Factory (the module's headline pattern)**: `SubscriptionStrategy` interface — `FreeSubscriptionStrategy` (1 concurrent stream, ads, 6 skips/hour, no downloads, 128kbps), `PremiumSubscriptionStrategy` (2 streams, ad-free, unlimited skips, downloads, lossless FLAC), `FamilySubscriptionStrategy` (6 streams, ad-free, downloads, 320kbps) — resolved by `SubscriptionStrategyFactory.getStrategy(plan)` via an `EnumMap` built once in the constructor, the same shape as `splitwise.strategy.SplitStrategyFactory`. `PlaybackService` and `MusicStreamingService` call only the interface (`maxConcurrentStreams()`, `canSkip()`, `isAdFree()`, `canDownloadOffline()`, `audioQuality()`) — nothing branches on the `SubscriptionPlan` enum directly.
- **Concurrent-stream limit (the concurrency centerpiece)**: `PlaybackService.startStream` does "count my account's active sessions, then start a new one if under the plan's limit" — a check-then-act race. Two devices on a FREE account (limit 1) calling `startStream` at the same instant can both read `activeCount == 0` before either has written its session. A `ReentrantLock` keyed per `userId` (`computeIfAbsent`, same idiom as `RestaurantTableAllocationService`) makes the check-and-increment atomic per account while unrelated accounts stream fully in parallel.
- Observer: `PlaybackEventListener` is notified by `PlaybackService` whenever a stream starts — `ListeningHistoryListener` appends the play to the user's history, `PlayCountListener` bumps the song's global play count. `PlaybackService` holds no reference to either; Spring injects every registered listener bean.
- `RecommendationService`: genre-affinity ranking — builds the set of genres from the user's liked songs and listening history, ranks unheard songs in those genres by play count, and fills any shortfall with global top plays for a new user with no signal yet.
- Exception hierarchy: `MusicStreamingException extends com.lld.config.DomainException` with `SongNotFoundException`/`UserNotFoundException`/`PlaylistNotFoundException`/`SessionNotFoundException` (404), `ConcurrentStreamLimitExceededException`/`SessionAlreadyEndedException` (409), `SkipLimitExceededException` (429), `DownloadNotAllowedException` (403), `InvalidPlaylistOperationException` (400).
- Tests: `MusicStreamingServiceTest` (playlists, likes, downloads, subscription changes, recommendations, playback), `SubscriptionStrategyTest` (each tier's exact permissions, factory resolution), `MusicStreamingRepositoryTest` (storage, seed data, id generation, active-session counting), `MusicStreamingConcurrencyTest` (N devices racing one account at FREE/PREMIUM/FAMILY limits, disjoint accounts not contending, a 300-round repeated race, `simRace` always settling at exactly the plan's limit).

### Frontend
- 4 tabs: App, Interactive 2D Simulation, Class Diagram, Design Details.
- App tab: switch between the three seeded users, browse the catalog with play/like/download, watch active sessions animate with a waveform, manage playlists and recommendations, and change subscription tier live.
- 8-step interactive simulation against isolated `/api/music-streaming/sim/*` endpoints — races 5 devices against a FREE account's 1-stream limit, upgrades to FAMILY and races again at a higher limit, burns a FREE account's 6 hourly skips and shows the 7th refused, and shows a FREE download refused then a PREMIUM download succeeding — the plan-tier rules demonstrated live, not asserted in prose.

## Course Registration Module
### Backend
- `CourseRegistrationInitializer`: a prerequisite chain (`CS101` → `CS201` → `CS301` → `CS401`, `MATH101` → `MATH201`), 7 sections across 6 courses, and 5 students with varying completed-course records. `CS201-A` is deliberately capacity-2 and pre-filled to 2/2 with a third student already `WAITLISTED`, so the demo starts with a live waitlist entry ready to be promoted. `CS201-A` and `MATH201-A` deliberately overlap on Monday/Wednesday so a schedule-conflict rejection is reachable live in the UI.
- `CourseRegistrationService`: Facade over `register(studentId, sectionId)` (prerequisite check → schedule-conflict check → atomic capacity-checked enroll-or-waitlist) and `drop(registrationId)` (releases the seat, promotes the next waitlisted student), plus isolated sim methods (`simRegister`, `simDrop`, `simRace`) against a second `CourseRegistrationRepository`/`SectionCapacityManager` pair. Both the live and sim registration paths share one `doRegister()` code path, so the sandbox can never silently diverge from production validation.
- **Per-Section Capacity Lock + FIFO Waitlist (the concurrency centerpiece)**: `SectionCapacityManager` adapts the per-entity `ReentrantLock` idiom from `airline.SeatLockManager` / `carrental.ReservationLockService` (`computeIfAbsent`, fair lock) to a capacity *counter* plus a `Deque<String>` waitlist instead of a single seat flag or a set of date ranges. `register()` re-checks `enrolledCount < capacity` **inside** the lock and enrolls-or-waitlists atomically; `drop()` releases the seat and promotes the FIFO-head waitlisted student **under the same lock acquisition** as the drop, so a drop and a concurrent new registration for the freed seat can never both win it — the already-queued student always gets promoted, never a new racer.
- Registration never fails outright on a full section — it waitlists. `RegistrationStatus`: `ENROLLED`, `WAITLISTED`, `DROPPED`, `COMPLETED`; no admin approval gate (the module's earlier design sketch had `DRAFT`/`SUBMITTED`/`APPROVED`, cut in favor of the synchronous hold/confirm shape shared with `airline`/`movieticket`).
- Prerequisite checking: `Course.prerequisiteCourseCodes` vs. `Student.completedCourseCodes`, rejecting with the specific missing code(s) via `PrerequisiteNotMetException`.
- Schedule-conflict detection: `TimeSlot.conflictsWith(other)` — day-set intersection AND half-open `[start, end)` time-interval overlap, both required; checked against every section the student is currently `ENROLLED` in via `ScheduleConflictException`.
- Exception hierarchy: `CourseRegistrationException extends com.lld.config.DomainException` with `CourseNotFoundException`/`SectionNotFoundException`/`StudentNotFoundException`/`RegistrationNotFoundException` (404), `PrerequisiteNotMetException`/`ScheduleConflictException`/`AlreadyRegisteredException` (409), `InvalidDropException` (400).
- Tests: `CourseRegistrationServiceTest` (full workflow + every rejection), `TimeSlotConflictTest` (pure conflict arithmetic — identical/partial/back-to-back/disjoint/multi-day/contained intervals, `null`-safety), `CourseRegistrationRepositoryTest` (storage, active-registration indexing, status filtering, id generation), `CourseRegistrationConcurrencyTest` (20 students racing for one seat — exactly 1 `ENROLLED`, 19 `WAITLISTED`, none rejected outright; a 300-round repeated 2-vs-1 race; concurrent drop + 10 new registrations for the freed seat — the already-queued student always wins, never a racer; disjoint sections not contending; unique registration ids under load). The lock was verified by deliberately removing it and rerunning: `repeatedRaceNeverProducesTwoWinners` failed at round 2 (`expected: <1> but was: <2>`), confirming the test actually catches the race before the lock was restored.

### Frontend
- 4 tabs: App (catalog & registration), Interactive 2D Simulation, Class Diagram, Design Details.
- App tab: student selector with completed-course badges, live course catalog with per-section capacity bars and waitlist counts, register/join-waitlist/drop actions, and a polled "My Registrations" table.
- 8-step interactive simulation against isolated `/api/course-registration/sim/*` endpoints — step 2 fires 6 students' `register()` calls at one 3-seat section concurrently via a server-side `CountDownLatch` (`simRace`), rendering per-student ENROLLED/WAITLISTED outcomes so the capacity race is demonstrated live rather than asserted in prose; later steps trip a live prerequisite rejection, a live schedule-conflict rejection, and a drop-then-promotion cycle with a final capacity-conservation check.

## Chess Module
### Backend
- `Game`: typed 8×8 `Piece[8][8]` board (a `Piece` is an immutable `(PieceType, Color)` pair, serialized over the wire as the same `"wK"`/`"bP"` two-character codes the frontend always expected, via `@JsonValue`), `kingMoved[2]`/`rookMoved[4]` castling-rights flags, and a nullable `enPassantTarget` — the square skipped over by the immediately preceding pawn double-step, cleared by every other move.
- Strategy Pattern: one `PieceMoveStrategy` per piece type (`PawnMoveStrategy`, `RookMoveStrategy`, `KnightMoveStrategy`, `BishopMoveStrategy`, `QueenMoveStrategy`, `KingMoveStrategy`), each owning only its own shape/path rules plus a raw `attacksSquare` pattern (pawns attack diagonally regardless of occupancy; kings never "attack" via castling). `PieceMoveStrategyFactory` resolves by `PieceType` from an `EnumMap` built from the injected `List<PieceMoveStrategy>` — adding a piece type is a new `@Component`, not a new `switch` arm.
- `KingMoveStrategy` implements castling end to end: king/rook-moved flags, empty squares between them, king not currently in check, and — via a `SquareAttackChecker` callback the service injects through `MoveContext` — the king may not pass through or land on an attacked square.
- Command Pattern: `ApplyMoveCommand` (`MoveCommand` interface) encapsulates mutating a *validated* move as a reversible unit — board write, castling's rook hop, en passant's off-square capture removal, promotion's piece swap, move-history append — with a working `undo()`, decoupled from the legality checks in `ChessService`.
- `ChessService.makeMove`: `isShapeValid` (bounds, own-piece-capture, per-type strategy) then `leavesOwnKingInCheck` (simulates the move — including an en-passant capture — on a cloned board) *before* `ApplyMoveCommand` ever mutates the real game, so a shape-legal move that exposes the mover's own king throws `MoveIntoCheckException` distinctly from a shape-illegal one (`InvalidMoveException`).
- State Machine: `GameStatus` (`ACTIVE`, `CHECK`, `CHECKMATE`, `STALEMATE`, `DRAW`, `RESIGNED`) declares its transitions in a `Map<GameStatus, Set<GameStatus>>` with `isTerminal()`/`canTransitionTo()`, mirroring `uber.model.RideStatus`; the service refuses any move once `isTerminal()` is true.
- Concurrency: a per-game `ReentrantLock` (`Map<Long, ReentrantLock>`, `computeIfAbsent`) held for the whole read-validate-mutate span of `makeMove`, so two near-simultaneous requests for the *same* game cannot both read the pre-move board and both mutate it (which would double-append move history and flip the turn back to the mover); unrelated games never contend for each other's locks.
- Exception hierarchy: `ChessException extends com.lld.config.DomainException` with `GameNotFoundException` (404), `NotYourTurnException`/`InvalidMoveException`/`MoveIntoCheckException`/`NoPieceAtSquareException` (400), `GameOverException` (409).
- Isolated `/api/chess/sim/*` engine: a second `ChessRepository` instance (`simReset`/`simGetGame`/`simMove`/`simGetEventLog`) so the demo cannot touch a real game; `simReset` seeds a fresh Magnus-vs-Hikaru game and clears the `SimEvent` log.
- Tests (previously zero — move validation and checkmate detection were completely untested): `ChessServiceTest` (per-piece move generation, pins, check/checkmate/stalemate including a hand-built back-rank mate *and* the full Scholar's Mate played move by move from the opening, castling with every illegality condition, en passant including expiry, promotion with and without an explicit piece choice, turn enforcement, resignation), `ChessMoveStrategyTest` (each strategy in isolation, no service or check-safety involved), `ApplyMoveCommandTest` (execute/undo round-trips including castling and en passant), `ChessRepositoryTest`, `GameStatusTest`, `ChessConcurrencyTest` (two and twenty threads racing the same move on one game — exactly one wins; disjoint games never contend; a 100-round repeated race).

### Frontend
- 4 tabs: Game, Interactive 2D Simulation, Class Diagram, Design Details.
- Simulation tab plays the scripted Scholar's Mate (4 moves per side) against the isolated `/api/chess/sim/*` sandbox, one step per click, rendering the live server-side event log as the telemetry HUD.

## Inventory Module
### Backend
- `InventoryRepository`: seeds 8 products across 5 categories (3 already below their reorder level on load) and 3 suppliers. `ConcurrentHashMap` storage plus a bounded `Deque<InventoryEvent>` audit log (200 entries, oldest evicted first).
- `InventoryService`: Facade over `addProduct`, `updateStock`, `reorder`, `transferStock`, `getLowStockItems`, plus an isolated `sim*` sandbox (`simSell`/`simRestock`/`simTransfer`/`simReorder`/`simRace`) against a second `InventoryRepository`/`StockAlertNotifier` pair. Live and sim mutations both funnel through one private `doUpdateStock()`, so validation, arithmetic and crossing-detection alerting can never drift between the two paths — the same shared-path idiom course-registration and restaurant use.
- **Observer Pattern**: `StockAlertNotifier` (Subject) fans every `StockAlert` out to a `CopyOnWriteArrayList<StockAlertObserver>` — `InAppStockAlertObserver` (the queryable feed behind `GET /alerts`, bounded to 100) and `LoggingStockAlertObserver` (writes to the server log), neither aware the other exists. See RCA-012: the in-app observer was briefly also invoked directly by the same call site that published to it, double-firing every alert — fixed by trusting the fan-out as the only delivery path.
- **Strategy + Factory (Reorder Policies)**: `ReorderStrategy` — `MinRestockStrategy` (exact shortfall to the reorder level, rejects if already at/above it), `EoqReorderStrategy` (classic Harris EOQ lot size, `ceil(sqrt(2DS/H))`, deterministic per product), `UrgentBufferReorderStrategy` (5× reorder level on a true stock-out, 3× otherwise, always ≥1) — resolved by `ReorderStrategyFactory` via an `EnumMap`, the same shape as `splitwise.strategy.SplitStrategyFactory`.
- **Per-Product Lock with Crossing Detection (the concurrency centerpiece)**: a fair `ReentrantLock` per product (`computeIfAbsent`, same idiom as `DriverAssignmentService`) guards the stock arithmetic AND the LOW_STOCK/OUT_OF_STOCK/RESTOCKED crossing check inside the same critical section — so two concurrent sales of the last unit can never both succeed, and an alert fires exactly on the crossing, never again while already in that state. `InventoryConcurrencyTest` fires N buyers at a K-unit product and asserts exactly K win, the rest get `InsufficientStockException`, and stock lands at exactly zero.
- Exception hierarchy: `InventoryException` (abstract) `extends com.lld.config.DomainException` with `ProductNotFoundException` (404), `InvalidStockOperationException` (400), `InsufficientStockException` (409). Being abstract, it's excluded from `DomainExceptionContractTest`'s scan automatically — no manual allowlist entry needed, unlike this repo's other module base exceptions.
- Tests: `InventoryServiceTest` (product validation, stock movement both directions, all three crossing transitions fired exactly once each, reorder via all three policies, sim sandbox isolation), `ReorderStrategyTest` (pins the exact quantity math for all three policies plus factory resolution), `InventoryRepositoryTest` (seed data, atomic id generation, category filtering, the 200-entry event cap), `InventoryConcurrencyTest` (last-unit race, K-of-N race, disjoint products not contending, a 300-round repeated race). The lock was verified by disabling it: `lastUnitRace_onlyOneWins`-style assertions failed with more than one winner before the lock was restored.

### Frontend
- 4 tabs: 📋 Products & Alerts, 🕹️ Interactive Simulation, Class Diagram, Design Details — rebuilt onto the shared `LldPage` shell (it previously rendered `ClassDiagram`/`DesignDetails` directly, bypassing the shell entirely).
- Products & Alerts: category filter, add-product form, per-product manage panel (stock update, reorder-policy trigger), and a live-polled recent-alerts feed.
- 8-step Interactive Simulation against isolated `/api/inventory/sim/*` endpoints — reset, view seeded stock, a normal sale, a sale that crosses the reorder line (LOW_STOCK), selling out completely (OUT_OF_STOCK), restocking back above the line (RESTOCKED), an auto-reorder (REORDER_PLACED), and a live N-buyers race for the last units with a telemetry HUD (succeeded/rejected/remaining stock) — the previous "simulation" tab mutated **live** stock directly instead of using this sandbox at all.

## LRU Cache Module
### Backend
- `LruCache<K,V>`: capacity, a `Map<K, Node<K,V>>` for O(1) key lookup, the active `EvictionPolicy<K,V>`, one `ReentrantLock` guarding the whole instance for the full span of every operation, hit/miss/eviction counters, and a rolling 50-entry operation log.
- **Strategy Pattern** (already present before this PR): `EvictionPolicy<K,V>` — `LRUEvictionPolicy` (sentinel head/tail doubly-linked list, O(1) promote/evict), `LFUEvictionPolicy` (ranks by access count, ties broken by oldest `lastAccessedAt`), `FIFOEvictionPolicy` (strict insertion order — an access never protects an entry). `setPolicy()` swaps the active strategy at runtime and replays every current node into it.
- `LruCacheService`: Facade holding exactly two `LruCache<String,String>` instances — the primary cache the Operations/Telemetry/Logs tabs show, and a fully independent `simCache` backing `/api/lrucache/sim/*` (already a complete, working isolated engine before this PR — verified, not rebuilt).
- Exception hierarchy (new): `LruCacheException` (abstract) `extends com.lld.config.DomainException` with `InvalidCapacityException` (400) — the constructor and `setCapacity()` previously silently no-op'd on a non-positive capacity (the caller got a stale 200 with no signal anything was wrong); both now throw. The controller's `setCapacity`/`setPolicy` handlers no longer swallow the resulting exception in a `try/catch(Exception ignored)` — failures now surface as real HTTP errors.
- This module has no repository package — cache state lives directly on the `LruCache` model instance, so there is no separate persistence layer to test.
- Tests: `LruCacheServiceTest` (pre-existing — basic put/get, eviction, capacity resize, policy switching, plus a lenient concurrency smoke test that only asserted `hits > 0`), `LruCacheModelTest` (new — constructor/`setCapacity` validation, direct LRU/FIFO/LFU eviction-order assertions), `LruCacheConcurrencyTest` (new — latch-gated, not sleep-based, per RCA-006: N distinct-key inserts settle at exactly capacity and never above it, N inserts under capacity are never lost or corrupted, a mixed GET/PUT storm on a small shared key space never exceeds capacity and never returns a corrupted value, concurrent `remove()` of the same key is linearizable).

### Frontend
- Uses the shared `LldPage` shell. Tabs: operations, telemetry, logs, simulation, diagram, design.
- The Simulation tab ("Interactive 2D Memory Rack") was already correctly wired to the isolated `/api/lrucache/sim/*` engine before this PR — confirmed by reading the controller/service, not assumed.

## Snake & Ladders Module
### Backend
Full build-out — this module shipped with zero tests across its entire history; see RCA-014 for a
real bug that history let ship.
- `Game`: id, 2-4 `Player`s, current-turn index, the snake/ladder `Map<Integer,Integer>` lookups, its own injected `DiceRoller`, `GameState`, winner, and the last roll/message the UI shows.
- **Strategy Pattern (new)**: `DiceRoller` (`roll(): int`) — `RandomDiceRoller` (production, a Spring bean wrapping `java.util.Random`) and `FixedDiceRoller` (tests — replays a fixed sequence, repeating its last value once exhausted rather than throwing). The model previously called a static `Random` directly from `Dice.roll()`, which made deterministic testing of exact-landing/snake/ladder rules impossible; `Dice.java` is now deleted.
- Exact-count win rule (verified correct by new tests, not a bug): landing exactly on cell 100 wins; overshooting forfeits the roll and the player stays in place, turn still passes.
- Snake-bite and ladder-climb resolution (verified correct): a single Map lookup per landed-on cell, no chaining across the default board (no snake head/ladder top/bottom overlaps another's destination).
- Multiplayer turn order (verified correct): cycles and wraps correctly for 2, 3, and 4 players; stops advancing past the winner.
- Exception hierarchy (new): `SnakeLaddersException` (abstract) `extends com.lld.config.DomainException` with `GameNotFoundException` (404), `InvalidPlayerCountException` (400 — see RCA-014: 5+ players previously threw an unhandled `IndexOutOfBoundsException` since only 4 token colors exist), `GameAlreadyFinishedException` (409 — rolling on a finished game previously returned `-1` silently instead of signaling anything).
- Concurrency (new): a per-game `ReentrantLock` map, mirroring `ChessService` — the module previously had **no locking at all** around `rollDice`, unlike every other reference module in this repo.
- Isolated `/api/snakeladders/sim/*` engine (new): a second `GameRepository` instance (`simReset`/`simGetGame`/`simRoll`/`simGetEventLog`) seeded with a 2-player game, so the demo tab cannot touch a real match.
- Tests (new, 18 cases in one class — this module's repository is an identical-shape thin wrapper to tictactoe's with no independent behaviour, so that coverage is merged into the service test rather than duplicated in a separate repository test): player-count validation at 0/1/2/3/4/5, exact-landing win, overshoot forfeiture, snake bite, ladder climb, 3- and 4-player turn cycling, win stopping the turn cycle, the finished-game roll guard, both `DiceRoller` implementations, sim-engine isolation.

### Frontend
- The Simulation tab now drives the isolated `/api/snakeladders/sim/*` sandbox (it previously called the real `createGame`/`rollDice` endpoints directly).

## Minesweeper Module
### Backend
Full build-out — this module shipped with zero tests across its entire history; see RCA-015 and
RCA-016 for two real bugs that history let ship, one of them a live availability hang.
- `Game`: id, `Cell[][]` board, dimensions, `totalMines`, `GameStatus`, flag/reveal counters, and a new `firstClickDone` flag.
- **First-click-safe policy (new — did not exist before)**: mines are placed lazily, on the first `revealCell` call, excluding only the clicked cell (not its full neighborhood — the simpler of the two conventional policies, documented on `MinesweeperService`). Previously mines were placed at `createGame` time, so a player's very first click could immediately lose the game.
- **Strategy Pattern (new)**: `MinePlacer` (`place(board, rows, cols, totalMines, excludeRow, excludeCol)`) — `RandomMinePlacer` (production, a Spring bean) and `FixedMinePlacer` (tests — an explicit coordinate list, ignoring the exclusion, for asserting flood-fill/win/loss against a known board). The service previously called a bare, unseeded `Random` directly, which is what made this module's flood-fill/win/loss/first-click behavior impossible to test deterministically before now.
- Flood-fill reveal (verified correct by new tests, not a bug): a zero-adjacency cell cascades into all 8 neighbors recursively; a numbered (non-zero-adjacency) cell is revealed as a leaf and never cascades further; bounds are checked before every array access so a corner/edge reveal cannot index out of range.
- Win condition (verified correct): every non-mine cell revealed. Loss condition (verified correct): a mine revealed.
- Exception hierarchy (new): `MinesweeperException` (abstract) `extends com.lld.config.DomainException` with `GameNotFoundException` (404), `GameOverException` (409), `InvalidCellException` (400 — see RCA-016: an out-of-bounds reveal/flag previously threw a bare, unhandled `ArrayIndexOutOfBoundsException`), `InvalidBoardConfigException` (400 — see RCA-015: a mine count at or above the cell count previously spun the placement loop **forever**, an unbounded CPU-pinning hang, not just a wrong status code).
- Concurrency (new): a per-game `ReentrantLock` map replacing a previous single module-wide lock that serialized every unrelated game against every other for no reason.
- Isolated `/api/minesweeper/sim/*` engine (new): a second `MinesweeperRepository` instance on a fixed 5x5/3-mine board (`simReset`/`simReveal`/`simFlag`/`simGetGame`/`simGetEventLog`).
- Tests (new): `MinesweeperServiceTest` (20 cases — board-config validation including the former hang case under a JUnit `@Timeout`, first-click-safety proven **deterministically** by filling every non-excluded cell with mines so the excluded cell's mine-freedom isn't just statistically likely, flood-fill cascade shape and its numbered-cell stopping point, corner-reveal bounds safety, win/loss, flagging interactions, out-of-bounds guards, the game-over guard, both `MinePlacer` strategies, sim-engine isolation), `MinesweeperConcurrencyTest` (3 cases — concurrent first-reveal race on one cell places mines exactly once, concurrent distinct reveals never corrupt `revealedCount`, disjoint games never contend for one lock). This module's repository is a bare id/save/get wrapper with no independent behaviour, so that coverage is merged into the service test rather than duplicated.

### Frontend
- The Simulation tab now drives the isolated `/api/minesweeper/sim/*` sandbox on its fixed 5x5 board (it previously called the real `createGame`/`revealCell` endpoints directly).

## TaskManagement Module
### Backend
Raised from a bare CRUD service (plain getters/setters, a `TaskStatus` enum with no transition
rules, no exceptions, no tests) to the reference bar — same pass shape as inventory/trafficsignal.
- `Board`/`Task` (new — Lombok `@Data @Builder`): `Task` carries `boardId` as a foreign key instead
  of `Board` embedding a task map directly, so a board and its tasks can never be mutated out of
  sync with each other (the old `Board.tasks` `ConcurrentHashMap` duplicated `TaskRepository`'s
  own map and could drift).
- **State Pattern (new)**: `com.lld.taskmanagement.state` — one singleton class per `TaskStatus`
  (`TodoState`, `InProgressState`, `ReviewState`, `BlockedState`, `DoneState`, `CancelledState`),
  each declaring its own `Set<TaskStatus> allowedNext()` — the same class-per-state shape as
  `trafficsignal.state.SignalState`, but a declared **set** of legal next statuses per state rather
  than a single `next()` pointer, since e.g. `REVIEW` legally fans out to `DONE`, back to
  `IN_PROGRESS` (changes requested), or `BLOCKED`. `Task#transitionTo(target)` is the one
  enforcement point; an illegal request throws `IllegalTaskTransitionException` (409) and leaves
  the task's status unchanged. `TODO -> IN_PROGRESS -> REVIEW -> DONE` is the happy path; `BLOCKED`
  is reachable from `IN_PROGRESS`/`REVIEW`, `CANCELLED` from any non-terminal status; `DONE` and
  `CANCELLED` are terminal.
- **Strategy + Factory (new — Board Ordering)**: `TaskOrderingStrategy` — `FifoWithinPriorityStrategy`
  (priority weight descending, ties by creation order), `DueDateFirstStrategy` (earliest deadline
  first, no-due-date tasks sort last), `WeightedScoreStrategy` (priority weight `x100` plus a
  deterministic urgency bonus for a deadline within 30 days of creation — computed from
  `dueDate - createdAt`, not wall-clock `now`, so it pins exactly in tests) — resolved by
  `TaskOrderingStrategyFactory` via an `EnumMap`, the same shape as
  `inventory.strategy.ReorderStrategyFactory`. `TaskService` never branches on the policy itself.
- **Per-Task Lock guarding two real check-then-act races (the concurrency centerpiece)**: a fair
  `ReentrantLock` per task (`computeIfAbsent`, same idiom as `InventoryService`) guards both
  `moveTask` (re-validates the transition against the CURRENT status inside the lock, so two
  callers racing for different terminal statuses from the same source status can never both apply)
  and `claimTask` (assigns only if currently unassigned, re-checked inside the lock, so two actors
  racing to claim the same task can never both win). Live and sim paths share the exact same
  `doMoveTask`/`doClaimTask` methods, parameterized by which repository/lock-map to use.
- Exception hierarchy (new): `TaskException` (abstract) `extends com.lld.config.DomainException`
  with `TaskNotFoundException` (404), `BoardNotFoundException` (404),
  `IllegalTaskTransitionException` (409), `TaskAlreadyAssignedException` (409),
  `InvalidTaskOperationException` (400). Being abstract, `TaskException` is excluded from
  `DomainExceptionContractTest`'s scan automatically, the same as `InventoryException`.
- Isolated `/api/tasks/sim/*` engine (new): a second `TaskRepository` instance seeded with 4 demo
  tasks walked through the real state machine to reach their seed status (not set directly), plus
  `simMove`/`simClaim`/`simOrder`/`simClaimRace`/`simTransitionRace`/`simGetEvents`.
- Tests (new, 5 classes): `TaskStateTest` (the full declared transition table, terminal-state
  rejection, the REVIEW->IN_PROGRESS loop-back, the TODO..DONE happy path), `TaskOrderingStrategyTest`
  (pins the exact ordering and tie-break rules for all three strategies plus factory resolution),
  `TaskRepositoryTest` (board/task id generation, board-scoped and status-scoped lookups, `clear()`),
  `TaskServiceTest` (board/task CRUD, the state machine wired through the service, claim exclusivity,
  sim sandbox isolation), `TaskConcurrencyTest` (N actors racing to claim one task — exactly one
  wins, repeated 300 rounds; two actors racing `DONE` vs `CANCELLED` from `REVIEW` — exactly one
  applies and the final status is always a legal terminal outcome, repeated 300 rounds; many
  identical concurrent move-to-`DONE` calls — exactly one succeeds; disjoint tasks never contend).

### Frontend
- Rebuilt onto the shared `LldPage` shell with 5 tabs: Board, Interactive Simulation, Class
  Diagram, Sequence Diagram, Design Details — the board view groups tasks into 6 status columns
  and lets a board-wide ordering policy (FIFO/Due-Date/Weighted) reorder cards within each column
  via `GET /boards/{id}/ordered`, without the frontend re-implementing any ordering rule itself.
- 8-step Interactive Simulation against the isolated `/api/tasks/sim/*` engine: reset, view the
  seeded board, a legal move (state pattern), an illegal move rejected with the exact server
  message (state pattern's guard), another legal move, a side-by-side FIFO-vs-Weighted-Score
  comparison (strategy pattern), an N-actor claim race with a live succeeded/rejected/winner HUD,
  and a two-actor `DONE`-vs-`CANCELLED` transition race — the previous "simulation" tab was a
  purely client-side CSS animation with no backend calls at all.

## DigitalWallet Module
### Backend
Deepened from a bare CRUD service (one global `ReentrantLock`, `IllegalArgumentException` errors, no
tests, no sim, no patterns) — the previous frontend page didn't even use the shared `LldPage` shell.
- `WalletRepository`: seeds 3 wallets (Alice ₹5000, Bob ₹3000, Charlie ₹10000), `ConcurrentHashMap` storage for wallets and per-wallet transaction lists, `AtomicLong` id generators. A second, fully independent instance backs the `/sim/*` sandbox.
- **Command Pattern (new)**: `com.lld.digitalwallet.command` — `WalletCommand` (`execute(): Transaction`, default `describe()`), implemented by `CreditCommand`, `DebitCommand`, `TransferCommand`. Each command owns its own validation and locking; `WalletService` only builds a command, calls `execute()`, and appends it to a `List<WalletCommand> commandLog` — the wallet's operational history is literally that list, exposed read-only via `GET /api/wallet/command-log`.
- **Deadlock-free two-account transfer locking (the concurrency centerpiece)**: replaced the single global lock with one `ReentrantLock` per wallet (`ConcurrentHashMap<Long, ReentrantLock>`, lazily created via `computeIfAbsent`, same idiom as `InventoryService`'s per-product locks). `TransferCommand` never locks "from then to" — it always computes `firstId = min(fromId, toId)`, `secondId = max(fromId, toId)` and locks in that order, unlocking in reverse — so a reverse-direction transfer racing the same wallet pair acquires locks in the identical global order and a wait-cycle (the precondition for deadlock) can never form. `CreditCommand`/`DebitCommand` only ever hold one wallet's lock, so they need no ordering rule at all.
- Exception hierarchy (new): `WalletException` (abstract) `extends com.lld.config.DomainException`, with `WalletNotFoundException` (404), `InsufficientBalanceException` (409), `InvalidAmountException` (400), `SelfTransferException` (400 — transferring a wallet to itself). `WalletController` no longer catches exceptions itself; it translates HTTP only and lets `GlobalExceptionHandler` map the hierarchy. `DomainExceptionContractTest`'s classpath scan finds abstract base exceptions too (it is not filtered by modifier), so `WalletException` is listed in that test's `BASES` allowlist alongside `InventoryException` and the rest — same as every other module base, not an exception to the rule.
- Lombok models (new): `Wallet`, `Transaction` (nested `Type` and `Status` enums, matching `StockMovement`'s nested-enum convention) and `WalletSimEvent` all use `@Data @Builder @NoArgsConstructor @AllArgsConstructor`, replacing hand-written getters/setters/constructors.
- Isolated `/api/wallet/sim/*` engine (new): a second `WalletRepository` plus a second `ConcurrentHashMap` of wallet locks, rebuilt from scratch on every `simReset()`, with a `List<WalletSimEvent>` telemetry log (`id`, `stepNumber`, `eventType`, `status`, `details`) mirroring `trafficsignal.model.SimEvent`. `simCredit`/`simDebit`/`simTransfer` wrap the same command classes the live API uses; `simRace(walletAId, walletBId, transfers, amountEach, step)` fires N simultaneous alternating-direction transfers via a `CountDownLatch` and reports `totalBefore`/`totalAfter`/`conserved` so the demo can show the conservation property live, not just assert it in a test.
- Tests (new, previously zero): `WalletRepositoryTest` (seed data, atomic id generation, transaction filing under one vs. both wallets, `totalBalance()`), `WalletCommandTest` (each command's validation and arithmetic in isolation — insufficient balance, non-positive amount, unknown wallet, self-transfer, and that a rejected command leaves balances unchanged), `WalletServiceTest` (service-level orchestration, the command log recording exactly the executed commands and never a rejected one, sim-sandbox isolation from live balances), `WalletConcurrencyTest` (the load-bearing suite — 40 simultaneous transfers between two wallets latch-started together assert the combined balance is conserved *exactly*; 200 rounds of opposite-direction transfers racing the same pair prove no deadlock and exact conservation; disjoint wallet pairs transferring concurrently don't corrupt each other; a 100-round repeated head-to-head race never loses or creates money). All latch-gated, not sleep-based.

### Frontend
- Rebuilt onto the shared `LldPage` shell — the previous page rendered `ClassDiagram`/`DesignDetails` directly instead of using it. Tabs: 👛 Wallets & Transfers, 🕹️ Interactive Simulation, Class Diagram, Sequence Diagram, Design Details.
- Wallets & Transfers: wallet grid, create-wallet form, per-wallet manage panel (credit, debit, transfer), live transaction history, and the command-log feed from `GET /api/wallet/command-log`.
- 8-step Interactive Simulation against isolated `/api/wallet/sim/*` endpoints — reset, view seeded wallets, credit a wallet, debit a wallet, an over-limit transfer that is rejected (`InsufficientBalanceException` surfaced from inside `TransferCommand`'s locked section), a successful transfer, viewing the conserved total, and a live N-transfer race between two wallets with a telemetry HUD (succeeded/rejected/sum-conserved) — the previous "simulation" tab called the real `createWallet`/`addFunds`/`sendMoney` endpoints directly instead of an isolated sandbox.
- New sequence diagram (`data/sequences/wallet.js`) walks two opposite-direction transfers racing the same wallet pair through `TransferCommand`'s ascending-lock-order logic step by step — the property a class diagram cannot show.

## Auction Module
### Backend
Deepened from a bare CRUD service (no locking, no patterns, no tests) to the reference bar —
match `inventory`/`trafficsignal` for shape.
- `Auction`/`Bid`/`Bidder` converted to Lombok (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`), same shape as `inventory.model.Product`. `Auction` gained `incrementPolicy`/`incrementValue`, `startTime`/`endTime`, and `hasStarted(now)`/`hasEnded(now)` helpers that derive the bidding window from wall-clock time rather than trusting the cached `status` field.
- **Per-Auction Lock (the concurrency centerpiece)**: a fair `ReentrantLock` per auction id (`computeIfAbsent`, same idiom as `InventoryService.productLocks`) guards `AuctionService#doPlaceBid` end to end — the auction is re-fetched and the current-highest-bid re-checked **inside** the lock, so two threads racing the identical amount can never both believe they are leading. `AuctionConcurrencyTest` fires 12 threads at the identical winning amount and asserts exactly 1 wins and 11 are cleanly rejected with `BidTooLowException`, plus a 300-round repeated-race regression and a disjoint-auctions-do-not-contend case.
- **Observer Pattern**: `AuctionNotifier` (subject) fans every `OutbidEvent` out to a `CopyOnWriteArrayList<AuctionObserver>` — `InAppAuctionObserver` (queryable feed behind `GET /api/auction/notifications`, bounded to 100) and `LoggingAuctionObserver` (server log), neither aware the other exists. Published only when a bid actually supersedes a previous leading bidder — the opening bid on an auction never fires a notification (nothing to outbid yet).
- **Strategy + Factory (bid increment)**: `BidIncrementStrategy` — `FixedIncrementStrategy` (`currentBid + incrementValue`) and `PercentageIncrementStrategy` (`currentBid * (1 + incrementValue/100)`, rounded to 2dp) — resolved by `BidIncrementStrategyFactory` via an `EnumMap`, the same shape as `inventory.strategy.ReorderStrategyFactory`. `AuctionService` never branches on `BidIncrementPolicy` itself.
- **Lifecycle guards**: `requireBiddable(auction, now)` rejects a bid before `startTime` (`InvalidAuctionWindowException`, 400) and a bid at/after `endTime` or on an already-`CLOSED` auction (`AuctionClosedException`, 409) — derived from time, not the cached `status` field, so a late background sync can never let an invalid bid through. `syncStatus()` flips `PENDING`→`ACTIVE`→`CLOSED` lazily (under the same per-auction lock) purely for accurate display.
- Exception hierarchy: `AuctionException` (abstract) `extends com.lld.config.DomainException` with `AuctionNotFoundException`/`BidderNotFoundException` (404), `AuctionClosedException` (409), `BidTooLowException`/`InvalidAuctionWindowException`/`InvalidAuctionOperationException` (400). Abstract base excluded from `DomainExceptionContractTest`'s scan automatically, same as `InventoryException`.
- `AuctionInitializer` seeds 3 bidders (Alice, Bob, Charlie) and 4 auctions spanning both increment policies and every lifecycle state: "Vintage Guitar" (ACTIVE, fixed +₹10), "Antique Pocket Watch" (ACTIVE, +5%), "Rare Stamp Collection" (PENDING, starts later), "Antique Clock" (CLOSED) — reused identically by the live repository and every fresh sim sandbox.
- Isolated `/api/auction/sim/*` engine: a second `AuctionRepository`/`AuctionNotifier`/observer pair rebuilt from scratch on every `simReset()` (`simPlaceBid`/`simClose`/`simRace`/`simGetEvents`/`simSnapshot`), so the demo tab cannot touch live auctions. `simRace(auctionId, bidderCount, step)` fires `bidderCount` concurrent identical-amount bids via a `CountDownLatch` and reports exactly how many succeeded vs. were rejected — the same shape as `InventoryService.simRace`.
- Tests: `AuctionServiceTest` (create/register validation, first-bid and second-bid increment math for both strategies, lifecycle guards including a direct time-based `hasEnded` check that bypasses the cached status, outbid-notification correctness including "no notification on the opening bid", close/double-close, sim isolation), `AuctionStrategyTest` (pins the exact min-next-bid arithmetic for both strategies plus factory resolution), `AuctionRepositoryTest` (atomic id generation across all three id spaces, sort order, `AuctionInitializer` seeding), `AuctionConcurrencyTest` (the load-bearing equal-amount race, an ascending-race variant, disjoint-auction parallelism, a 300-round repeated race, and a `simRace`-driven variant of the same race through the isolated sandbox).

### Frontend
- `AuctionPage.jsx`/`api.js` call real endpoints throughout — no mocking. The Auctions tab gained increment-policy/start-delay fields on auction creation, a bid-history ladder, and a live outbid-notifications panel per auction.
- The Simulation tab was previously a client-only, entirely fake "gavel simulator" with no backend calls at all — replaced with an 8-step interactive demo wired to `/api/auction/sim/*`: reset, view the seeded sandbox, place the opening bid, get outbid (Observer pattern fires live), a too-low bid rejected, both lifecycle guards (`PENDING` and `CLOSED`) rejected, the `PERCENTAGE` strategy on a second auction, and an 8-bidder concurrent race. A telemetry HUD (current ask, notification count, bids placed, race succeeded/rejected), a countdown timer to the tracked auction's end time, animated bidder avatars that highlight the current leader and flash on being outbid, and a live bid ladder give the demo a genuine live-auction feel rather than a bare API log.

## SocialNetwork Module
### Backend
Deepened from a bare CRUD service (`IllegalArgumentException` everywhere, hand-written getters, no
tests, no patterns) to the reference bar — see RCA.md for the one non-trivial gotcha hit along the way.
- `User`/`Post`/`Comment`/`FriendRequest`: converted to Lombok `@Data @Builder @NoArgsConstructor
  @AllArgsConstructor`. `Post` keeps hand-written `addLike`/`removeLike`/`addComment` alongside the
  generated accessors, backed by `CopyOnWriteArraySet`/`CopyOnWriteArrayList` for safe concurrent
  engagement.
- `SocialRepository`: `ConcurrentHashMap`s for users/posts/friendRequests plus an adjacency-list
  `Map<Long, Set<Long>>` for the friend graph. Its no-arg constructor now seeds 3 demo users (Alice,
  Bob — already friends — and Carol) plus 2 posts, the same "constructor seeds demo data" idiom as
  `InventoryRepository`; used both by the live Spring singleton and to rebuild the `/sim/*` sandbox.
- **Observer Pattern (new)**: `FeedNotifier` (Subject) fans a `FeedEvent` out to a
  `CopyOnWriteArrayList<FeedObserver>` on every `createPost` — `InAppFeedObserver` (queryable log
  behind `GET /api/social/feed-events`, bounded to 100) and `LoggingFeedObserver` (server log),
  neither aware the other exists. Mirrors `com.lld.inventory.observer.StockAlertNotifier` exactly.
- **Canonical Pair Locking (new)**: `SocialService#friendPairLocks` is a
  `ConcurrentHashMap<String, ReentrantLock>` keyed by `min(userId1,userId2) + "#" + max(userId1,userId2)`
  (the `linkedin.service.LinkedInService#sendConnectionRequest` idiom, generalized from `String` ids
  to `long`s). `sendFriendRequest` and `respondToRequest` between the same pair always resolve to the
  SAME lock object regardless of call direction; every check-then-act read (already friends? already
  pending? current request status?) happens after acquiring the lock and re-reads state inside it —
  that is what stops two concurrent sends or two concurrent accepts on the same pair from both
  succeeding.
- Typed exception hierarchy (new): `SocialException` (abstract) `extends com.lld.config.DomainException`
  with `UserNotFoundException` (404), `PostNotFoundException` (404), `FriendRequestNotFoundException`
  (404), `AlreadyFriendsException` (409), `DuplicateFriendRequestException` (409),
  `RequestAlreadyRespondedException` (409 — a second accept/reject on an already-resolved request),
  `InvalidSocialActionException` (400 — blank name/email/content, self-friend-request). Replaces every
  `IllegalArgumentException` the old service threw.
- Isolated `/api/social/sim/*` engine (new): a second `SocialRepository`/`FeedNotifier`/
  `InAppFeedObserver` triple rebuilt from scratch on every `simReset()`, plus a `List<SimEvent>`
  telemetry log (`simCreateUser`/`simCreatePost`/`simSendFriendRequest`/`simRespond`/`simLikePost`/
  `simAddComment`/`simRaceFriendRequests`/`simGetEvents`/`getSimSnapshot`). `simRaceFriendRequests`
  fires N concurrent `sendFriendRequest` calls at one pair (alternating direction) via a
  `CountDownLatch`, so the pair-lock's correctness is demonstrable live in the UI, not just in a test.
- Tests (new, 4 flavours across `SocialServiceTest`, `FeedNotifierTest`, `SocialRepositoryTest`,
  `SocialConcurrencyTest`): service-level validation and exception mapping for every endpoint, the
  Observer fan-out contract in isolation (one misbehaving observer can't break the rest, the 100-entry
  cap), repository seed data and friend-request/friendship invariants, and a concurrency suite proving
  the pair lock: N threads racing to send a friend request between the same pair from both directions
  (exactly 1 wins), N threads racing to accept/reject the same request (exactly 1 wins, no lost
  accept), disjoint pairs never contend, and a 200-round repeated race that never produces two
  winners — all latch-gated, no `Thread.sleep`.

### Frontend
- `SocialNetworkPage.jsx` already called the real `/api/social/*` endpoints via `api.js` before this
  pass (an earlier `HANDOFF.md` claim that it mocked data was stale) — confirmed by reading the
  wiring, not rebuilt.
- New 🕹️ Interactive Simulation tab (8 steps) against the isolated `/api/social/sim/*` sandbox: reset
  & seed, send a friend request, a duplicate send rejected live in the UI, accept forming a
  friendship, publish a post and watch the Observer fan-out count, like/comment engagement, a new
  user joining, and an 8-way concurrent friend-request race between two users with a telemetry HUD
  (users/friendships/pending/posts/feed-fan-outs tiles, a won/rejected race bar) plus a small SVG
  social-graph visualization (solid edges = friends, dashed = pending) that pulses the node touched by
  each step.
- New Sequence Diagram tab (`data/sequences/social-network.js`): the concurrent friend-request race
  showing exactly when the pair lock is acquired relative to the "already friends"/"already pending"
  reads, and the post-publish → Observer fan-out hop.
- **`usePolling` added (RCA-044 follow-up)**: the timeline feed and the friends/pending-requests
  list both poll every 5s, so a friend's new post/like/comment and an incoming friend request show
  up without a manual refresh.

## Ludo Module
### Backend
Raised from a pure rules engine with zero tests, no `/sim/*` engine and no typed exceptions to the
reference bar — same pass shape as minesweeper/snakeladders, both just-finished board-game
siblings. Writing this module's first-ever tests surfaced three real bugs (RCA-020/021/022) and a
fourth, repo-wide bug during the upgrade itself (RCA-023).
- `Game`/`Player`/`Token` converted to Lombok (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`), matching `inventory.model.Product`'s shape. `Game.newGame(id, playerNames)` is now the only way to build a game (replacing a raw constructor that indexed a caller-supplied array with no length check — see RCA-021).
- **State Pattern (new) — token lifecycle**: `com.lld.ludo.state` — one singleton class per `TokenStatus` (`HomeState`, `ActiveState`, `FinishedState`), each declaring its own `Set<TokenStatus> allowedNext()`, the same class-per-state shape as `taskmanagement.state.TaskState`/`trafficsignal.state.SignalState`. `HOME -> ACTIVE` only on a roll of 6; `ACTIVE -> HOME` on capture or `-> FINISHED` on an exact-count landing; `FINISHED` is terminal. `Token#transitionTo(target)` is the one enforcement point — an illegal jump (a HOME token moving without a 6, a FINISHED token asked to move again) throws `InvalidMoveException` and leaves `status` unchanged. Whose-turn-it-is is intentionally *not* a separate state-pattern hierarchy — `currentPlayerIndex` has exactly one deterministic successor (`(index + 1) % 4`, or unchanged on a 6), so a declared transition table would add no expressiveness `GameStatus` (`WAITING`/`PLAYING`/`FINISHED`) doesn't already give it.
- **Strategy Pattern (new) — injectable dice**: `com.lld.ludo.dice.DiceRoller` (`roll(): int`) — `RandomDiceRoller` (production, a genuine 1-6 uniform roll; explicitly named `@Component("ludoRandomDiceRoller")` — see RCA-023 for the bean-name collision this closes) and `FixedDiceRoller` (tests — a fixed sequence, repeating the last value once exhausted), the exact idiom `snakeladders.dice.DiceRoller` and `minesweeper.strategy.MinePlacer` already use. This is what makes "roll a 6 to leave home" and exact-count home entry deterministically testable at all — the previous design called a bare, unseeded `Random` directly from the service.
- **Board model**: one shared 52-cell circular track (`Game.TRACK_SIZE`), 4 start squares (`START_POSITIONS = {0,13,26,39}`) doubling as 4 of the 8 safe squares (`SAFE_SPOTS`), no separate per-color home-column lane — a color's home cell is the single track cell one behind its own start (`Game.endPosition(playerIndex)`), reached only by an exact roll. Documented explicitly as a deliberate simplification, not an oversight.
- **Exact-count home entry, fixed (RCA-020)**: `LudoService#moveOnTrack` now compares the roll against `stepsToHome` *before* computing the new position — a roll that would overshoot the home cell is a complete no-op (`InvalidMoveException`, board unchanged), replacing a bug where the old modulo-only arithmetic silently wrapped an overshooting token back out onto the track for another lap.
- **Player-count validation, fixed (RCA-021)**: `createGame` now requires exactly 4 non-blank names (`InvalidPlayerCountException`, 400) before building the game — the board geometry (`START_POSITIONS`/`SAFE_SPOTS`/the 4-color palette) is compile-time, so unlike Snake & Ladders' 2-4 range, Ludo's valid seat count is a single value, not a window.
- **Roll/move contract, fixed (RCA-022)**: `hasAnyLegalMove` now calls the exact same own-token-block/`stepsToHome` checks `moveOutOfHome`/`moveOnTrack` use (previously it under-checked home exits, so a blocked start square could report a legal move that every actual `moveToken` call would then reject). `doRoll` also now rejects a second roll while the previous one is still unspent, closing a free-re-roll gap that let a caller discard an unfavorable value and try again.
- **Captures and safe squares (verified/fixed against real tests)**: landing on a non-safe square occupied by an opposing `ACTIVE` token sends it back `HOME` (`captureAtPosition`); the 8 `SAFE_SPOTS` — including all 4 start squares — are immune. A normal advance onto a square held by another of the *same* player's `ACTIVE` tokens is rejected (`isBlockedByOwnToken`), separately from the capture rule.
- **Rolling a 6 grants an extra turn, uncapped** — locked in and documented explicitly as the exact rule this module enforces; the classic "three sixes forfeits the turn" house rule is intentionally out of scope.
- Exception hierarchy (new): `LudoException` (abstract) `extends com.lld.config.DomainException` with `GameNotFoundException` (404), `InvalidMoveException` (400), `InvalidPlayerCountException` (400), `NotYourTurnException` (409), `GameOverException` (409). Abstract base excluded from `DomainExceptionContractTest`'s scan automatically, same as `SnakeLaddersException`/`TaskException`.
- **Concurrency**: one `ReentrantLock` per live game id (`gameLocks`, lazily created via `computeIfAbsent`, same idiom as `TaskService`/`SnakeLaddersService`) replacing the previous single module-wide lock. The die is rolled *inside* the lock, not before it, so "is a roll pending" and "record this roll" are one atomic step.
- Isolated `/api/ludo/sim/*` engine (new): a second `LudoRepository`/lock map on a fixed 4-player sandbox (Alice/Bob/Charlie/Diana), with `simReset`/`simGetGame`/`simGetEventLog`/`simRoll`/`simMove` sharing the exact same `doRoll`/`doMove` core the live API uses, plus a `List<SimEvent>` telemetry log (actor, description, die value, a deep-copied token snapshot) that calls out captures and finishes in its generated description text.
- Tests (new, previously zero): `LudoStateTest` (the full declared `TokenState` transition table, terminal-state rejection, `Token#transitionTo` enforcement), `LudoServiceTest` (28 cases — player-count/blank-name validation, roll-six-to-leave-home, start-square blocking, exact-count overshoot rejection and boundary finish, own-token track blocking, captures, safe-square capture immunity, the roll/move contract guards, turn order and extra-turn-on-six, win condition, sim-engine isolation from live games — this module's repository is a bare id/save/get wrapper with no independent behaviour, so that coverage is merged in here rather than duplicated, the same call `MinesweeperService`'s AGENTS.md section made), `LudoConcurrencyTest` (N actors racing to spend the same pending roll on the same token — exactly one succeeds, repeated 300 rounds; disjoint games never contend for one lock).

### Frontend
- `LudoPage.jsx`/`api.js` rebuilt to call real endpoints only (no client-side mocking), covering `simMove` in addition to the pre-existing endpoints.
- The board is a real 14x14 ring rendering: the shared 52-cell track is laid out as the *border* of a 14x14 grid (perimeter `4*14-4 = 52`, matching `Game.TRACK_SIZE` exactly with no approximation), four corner cells as the colored start/safe squares, star icons on the other 4 safe spots, four colored yard panels for `HOME` tokens, and a center HUD panel showing whose turn it is and the last roll — shared between the Game tab and the Simulation tab via one `LudoBoard` component.
- 8-step Interactive Simulation against the isolated `/api/ludo/sim/*` engine: reset the sandbox, view the seeded board, roll and leave home, roll and advance, trigger a capture, approach home under the exact-count rule, an extra turn off a 6, and a live telemetry HUD (current turn, last roll, finished-token counts per color, capture count, status) plus a reverse-chronological event log — the previous "simulation" tab called the real `createGame`/`rollDice`/`moveToken` endpoints directly instead of an isolated sandbox.
- New sequence diagram (`data/sequences/ludo.js`) walks two concurrent `moveToken` calls racing the same pending roll on the same token through the per-game lock, showing why exactly one can ever spend it.

## Concurrency Primitives

Classic multithreaded-ordering interview problems, each `com.lld.concurrency.<primitive>/` sibling
to `blockingqueue`/`ttlcache` and following the exact same shape: a `TraceRecorder` functional
callback the primitive invokes for every real event, a `{Primitive}Service` that spins up genuine
`Thread`s, blocks on `Thread.join()` with a safety timeout, and returns a `RunResult` (`runId`,
config, `result`, `threadCount`, timing, `events: List<TraceEvent>`), and a controller exposing
`POST /api/concurrency/<name>/run`. The frontend page (`{Name}Page.jsx` + `api.js`) replays the
*real* returned trace inside its existing 2D scene instead of animating a canned/client-simulated
sequence — the visuals were kept as-is, only the data source changed. Each module's base exception
is abstract (`extends com.lld.config.DomainException`, `Invalid*ParametersException` at 400), and
`RunExecutionException` (a plain `RuntimeException`, not a `DomainException`) covers the
mathematically-unreachable-but-still-timeout-guarded thread-join failure path — same split as
`blockingqueue`.

- **FooBar Alternately** (`foobar/`): `FooBarPrinter` — two `Semaphore`s, `fooSemaphore(1)` /
  `barSemaphore(0)`. `foo()`/`bar()` each loop `n` times: acquire your own permit, append your
  token, release the *other* thread's semaphore. The ping-pong hand-off makes interleaving
  structurally impossible, not just unlikely. `FooBarPrinterTest` races real `foo-thread`/
  `bar-thread` pairs 100 times in a loop and asserts the exact `"foobar".repeat(n)` string every
  time — never sleep-and-hope.
- **Zero Even Odd** (`zeroevenodd/`): `ZeroEvenOddPrinter` — three `Semaphore`s,
  `zeroSemaphore(1)` / `oddSemaphore(0)` / `evenSemaphore(0)`. `zero()` always goes first for every
  number and releases exactly one of `oddSemaphore`/`evenSemaphore` based on parity; `odd()`/
  `even()` only ever get a turn when zero explicitly hands it to them, which is what structurally
  guarantees "0" precedes every number rather than merely usually preceding it.
  `ZeroEvenOddPrinterTest` races 100 iterations with a scrambled thread-start order each time and
  asserts the exact `"0 1 0 2 0 3 ..."` interleave.
- **Multithreaded FizzBuzz** (`fizzbuzz/`): `FizzBuzzPrinter` — one `ReentrantLock` + one
  `Condition` monitor shared by four threads (`number`, `fizz`, `buzz`, `fizzbuzz`), each looping
  `worker(predicate, formatter, ...)` against a single shared counter. The four predicates
  (÷15; ÷3-not-15; ÷5-not-15; neither) are mutually exclusive and collectively exhaustive over
  every integer, so exactly one thread's predicate ever matches — no busy-waiting, no possibility
  of a duplicate or skipped number. `FizzBuzzPrinterTest` races 100 iterations (varied start order)
  asserting the exact canonical `1..n` string.
- **Building H2O** (`h2o/`): `H2OBonder` — `hydrogenSemaphore(2)` / `oxygenSemaphore(1)` (the
  *entire* system-wide atom supply matches one molecule's composition) gate entry to a
  `CyclicBarrier(3)`. Because at most 2 H + 1 O permits can ever be outstanding, every barrier trip
  is necessarily exactly one molecule's worth — never 3 of the same element. The barrier's action
  (guaranteed by `CyclicBarrier` to run to completion, on the triggering thread, *before* any of
  the 3 waiting threads are released) is the single place the `"H"`, `"O"`, `"H"` tokens are
  appended in that fixed canonical order — this additionally guarantees no run of 3 identical atoms
  anywhere in the output, including across a trio boundary (see RCA-013 for the race this caught
  in `bond()`/`currentOutputLength()` before it ever shipped). `H2OService` spins up
  `2 * moleculeCount` hydrogen threads and `moleculeCount` oxygen threads in **shuffled** start
  order (not "all H then all O") to genuinely stress the coordination. `H2OBonderTest` races 50
  iterations of 20 molecules each and asserts every sliding 3-token window is exactly 2 H + 1 O.

### Frontend (all four)
- Each page keeps its pre-existing animated 2D scene (thread cards, semaphore/lock badges, an
  output stream) but the "step" button becomes a "Run Real Simulation" button that calls
  `POST /api/concurrency/<name>/run`, then replays the returned `events[]` on a fixed-interval
  timer, folding events into visual state exactly the way `blocking-queue`'s page does — nothing on
  screen is client-computed once a run starts.

### Bloom Filter / Concurrent HashMap / Merge Sort — the last frontend-only primitives

These three were different from the six siblings above: they had **no backend at all** — a pure
CSS/JS animation with `setTimeout` fakery and zero real threads (tracked in
`designDataCoverage.test.js`'s `PENDING_DESIGN_CONTENT` allowlist, now empty). Each got the exact
same `TraceRecorder`/`{Primitive}Service`/`RunResult`/`POST /api/concurrency/<name>/run` shape as
`blockingqueue`, built from a from-scratch primitive rather than a JDK wrapper, and each page's
*existing* visual vocabulary (segment grid, bit strip, array bars) was kept and rewired to replay
the real trace instead of driving it from client-side `setTimeout` state.

- **Concurrent HashMap** (`concurrenthashmap/`): `StripedHashMap<K,V>` — a striped-lock map built
  from scratch (deliberately not a wrapper around `java.util.concurrent.ConcurrentHashMap`, to tell
  the segment-locking story explicitly): an array of `segmentCount` independent segments, each a
  plain `HashMap` guarded by its own `ReentrantLock`; `segmentFor(key)` is
  `(key.hashCode() & 0x7fffffff) % segmentCount`, and every operation locks exactly one segment
  (never two at once, so there is no lock-ordering deadlock risk). `put`/`get`/`remove` are the
  obvious single-segment operations; `merge(key, delta, remap)` is an atomic read-modify-write under
  the segment lock (mirrors `ConcurrentHashMap.merge`); `computeIfAbsent(key, fn)` checks-then-acts
  under the same lock so a racing key is computed by exactly one thread. `ConcurrentHashMapService`
  proves both properties with real threads: Phase A starts `incrementer-N` threads `merge()`-ing a
  small set of shared counter keys and asserts `sumOfFinalCounters == totalIncrements` (no lost
  updates under contention); Phase B releases `racer-N` threads together via a `CountDownLatch` to
  race `computeIfAbsent()` on the same absent key and asserts `computeExecutions == 1`. Tests:
  `StripedHashMapTest` (single-threaded correctness), `StripedHashMapConcurrencyTest` (latch-gated
  real-thread proofs of both properties), `ConcurrentHashMapServiceTest` (orchestration + full
  validation matrix). Frontend keeps the pre-existing segment-grid visual (lock-owner highlighting,
  live bucket contents) but now folds it from the real replayed trace, plus a phase badge and a live
  `computeIfAbsent`-execution counter that should hold at exactly 1.
- **Concurrent Bloom Filter** (`bloomfilter/`): `BloomFilter` — a real `BitSet` bit array behind one
  `ReentrantLock` (`BitSet` itself is not thread-safe), with two independent deterministic hash
  functions combined via Kirsch–Mitzenmacher double hashing: `h1` is Java's specified
  `String.hashCode()` polynomial, `h2` is a from-scratch 32-bit FNV-1a over the UTF-8 bytes, and
  `position_i = floorMod(h1 + i*h2, bitSize)` for `i` in `0..hashCount-1`. `add`/`mightContain` never
  false-negative for an added item but can false-positive for one that was not added — the central
  probabilistic guarantee the whole module exists to demonstrate. `BloomFilterService` (defaults
  `bitSize=28, hashCount=3, addThreads=4`) splits a fixed 10-word item batch round-robin across real
  `adder-N` threads, then — fully deterministically, since both hash functions are pure functions of
  the string — scans `probe-0..probe-999` on the calling thread until it finds one `mightContain()`
  wrongly reports as present, reliably landing on `"probe-2"` with these defaults and zero collisions
  against its 6 true-negative candidates. Tests: `BloomFilterTest` (never-false-negative property
  across many item/param combinations), `BloomFilterConcurrencyTest` (latch-gated concurrent adders
  never lose a bit-array write), `BloomFilterServiceTest` (asserts the run's false positive actually
  reproduces, all added items are true positives). Frontend renders the bit array as a strip that
  lights up bit-by-bit as `BIT_NEWLY_SET`/`BIT_ALREADY_SET` events replay, then groups query results
  into ✅ true positives / ⭕ true negatives / ⚠️ the demonstrated false positive with its own callout.
- **Multi-threaded Merge Sort** (`mergesort/`): `ParallelMergeSorter` — a real
  `ForkJoinPool`/`RecursiveAction` divide-and-conquer sort, deliberately its own
  `new ForkJoinPool(parallelism)` rather than `ForkJoinPool.commonPool()` so which worker threads
  appear is reproducible regardless of the machine's core count. `SortTask.compute()` partitions
  `[lo,hi]`, and above `sequentialThreshold` genuinely forks: `right.fork(); left.compute(); right.join();`
  — `right` may be stolen and run on a different pool worker while `left` continues on the current
  thread, which is what shows up as differing `threadName`s in the trace (the actual proof of real
  parallel execution, not just recursion). Every value written during a merge is its own
  `MERGE_WRITE` trace event carrying the destination index, the value, and whether it came from the
  `LEFT` or `RIGHT` half. `MergeSortService` reports `distinctThreadsUsed` (count of distinct thread
  names across the trace) as the frontend-visible parallelism proof. Tests: `ParallelMergeSorterTest`
  (30-iteration fuzz against `Arrays.sort` as the reference, edge cases: empty/single/duplicates/
  negatives, input-array immutability), `ParallelMergeSorterConcurrencyTest` (asserts
  `distinctThreadsUsed > 1` for a large-enough array/threshold, several iterations since ForkJoin
  scheduling varies run to run), `MergeSortServiceTest` (defaults, custom array, validation matrix
  including an array/size mismatch). Frontend animates the array as bars, brackets the active
  `[lo,hi]` range on `PARTITION`/`FORK_RIGHT`, recolors cells live as `MERGE_WRITE` events replay
  (LEFT vs. RIGHT provenance), and ticks up a "distinct worker threads used so far" badge roster —
  the real-parallelism payoff made visible.

## Hotel Management Module
### Backend
Real domain logic was already solid (`RoomBookingService`'s per-room `ReentrantLock` with date-range
overlap checking, a `TariffStrategy` family for weekend surcharges, a `CancellationRefundStrategy`
family for notice-based refunds, `ReservationStatus`'s own declared transition table) — the module
was simply missing the simulation-sandbox and error-handling conventions every reference-bar module
has, and its diagram/design docs had gone stale across the refactor that added all of the above
(RCA-039/RCA-043).
- `HotelRepository`: hotels/rooms/bookings in-memory maps, seeded with 2 hotels (Grand Palace,
  Lake View Resort) and 10 rooms across SINGLE/DOUBLE/SUITE/DELUXE types.
- `RoomBookingService`: `book`/`checkIn`/`checkOut`/`cancel`/`markNoShow`/`isAvailable`, all under a
  per-room `ReentrantLock`; "is this room free" is always answered by `Booking#overlaps()` against
  the room's active reservations, never a room-wide status flag (`RoomStatus` only has
  AVAILABLE/MAINTENANCE).
- `TariffStrategyFactory` resolves `WeekendTariffStrategy` (1.25× surcharge on any Friday/Saturday
  night touched) vs. `StandardTariffStrategy` purely from the requested date range.
- `CancellationRefundStrategyFactory` resolves `FullRefundStrategy` (3+ days notice)/
  `PartialRefundStrategy` (50%, under 3 days but before check-in)/`NoRefundStrategy` (on/after
  check-in, or a no-show) purely from days-until-check-in and the booking's status.
- **Simulation sandbox, added (RCA-043)**: `HotelController` had no `/sim/*` endpoints and
  `HotelService`'s own javadoc said so explicitly. Added `com.lld.hotel.model.SimEvent` and a sim
  sandbox on `HotelService` — a second `HotelRepository`/`RoomBookingService` pair wired to fresh
  strategy-factory instances (reusing the real classes, not a parallel copy of their logic) — plus
  `simReset`/`simState`/`simBook`/`simCheckIn`/`simCheckOut`/`simCancel`/`simEvents`/`simRace`
  (N threads racing to book the same room/dates via a `CountDownLatch`-released `ExecutorService`,
  proving the per-room lock lets exactly one win).
- **Exception handling, fixed (RCA-043)**: `HotelController` wrapped every endpoint in its own
  `try/catch (Exception e)` returning a hardcoded `ResponseEntity.badRequest()` (400) — even though
  `HotelException`'s concrete subclasses were already correctly `@ResponseStatus`-annotated (404 for
  not-found, 409 for conflicts, 400 for a bad date range) and already in
  `DomainExceptionContractTest`'s allowlist. The try/catch silently defeated all of it. Removed
  entirely; every endpoint now lets its exception propagate to `GlobalExceptionHandler`.

### Frontend
- `HotelPage.jsx` migrated onto the shared `LldPage` shell — it was a fully standalone page (own
  header/back-link/nav, manually mounted `ClassDiagram`/`SequenceDiagram`/`DesignDetails`), the same
  bug shape issue #53 and RCA-040 already fixed elsewhere.
- **Simulation tab, fixed (RCA-043)**: the previous "Simulation" tab called the real production
  `bookRoom`/`checkInBooking`/`checkOutBooking` endpoints directly — every visitor who played the
  demo genuinely booked, checked in, and checked out Room R3 against live hotel data, since no
  isolated sandbox existed to call instead. Replaced with a `SimulationTab` driving the new
  `/api/hotel/sim/*` endpoints via an 8-step guided walkthrough: reset → book a weekend-inclusive
  stay (exercises `WeekendTariffStrategy`) → a 5-guest concurrency race on a second room → check-in →
  check-out → a second, non-weekend stay (exercises `StandardTariffStrategy`) → cancel it (exercises
  `CancellationRefundStrategy`) → final snapshot.
- **`usePolling` added (RCA-044 follow-up)**: the selected hotel's room grid polls every 5s so
  another guest's booking shows up without a manual refresh.

### Diagrams & Design Details (RCA-039)
`diagrams/hotel.js` and `design/hotel.js` documented a pre-refactor version of the module — a
4-value `BookingStatus` enum, `RoomStatus` including BOOKED/OCCUPIED as room-wide flags, and a single
lock field directly on `HotelService`/`HotelRepository` — none of which exist anymore, while omitting
`RoomBookingService` and both Strategy families entirely. Rewritten from the real source; the
"Dynamic Pricing" extensibility idea in the old design file was replaced since the pricing strategy
it proposed had, by the time this was read, already shipped as `TariffStrategy`.

### Tests (2 files -> 3)
`HotelServiceTest`/`HotelConcurrencyTest` (pre-existing, kept), `HotelSimTest` (new — `simReset`,
`simBook` pricing/logging, the check-in/check-out lifecycle, `simCancel`'s refund resolution,
`simRace`'s exactly-one-winner guarantee and its guest-count clamping).

## Running
```bash
cd backend && mvn package && java -jar target/lld-all-0.0.1-SNAPSHOT.jar   # port 59190 (or $BACKEND_PORT)
cd frontend && npm run dev                                                 # port 53000 (or $FRONTEND_PORT)
```
The Vite dev proxy and the Docker nginx config both forward `/api`, `/swagger-ui`, `/swagger-ui.html`
and `/v3/api-docs` to the backend, so the in-app Swagger link works on either origin.
Override with `VITE_BACKEND_URL` (proxy target) or `VITE_SWAGGER_URL` (link href).

## Testing
```bash
cd backend && mvn test        # 1657 tests, 180 classes
cd frontend && npx vitest run # 304 tests, 3 files
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

