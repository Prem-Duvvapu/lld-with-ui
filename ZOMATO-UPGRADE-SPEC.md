# Build spec — raise `zomato` to the reference bar (Phase 2, Wave 2A)

Hand this whole file to the implementing agent. Unlike the restaurant module, **zomato already
exists** — this is an upgrade, not a from-scratch build. Do not rewrite what works; add what is
missing and fix the one real defect named in section 1.

Repo: `lld-with-ui`. Java 17 / Spring Boot 3.2 backend on 9090, React 19 / Vite frontend on 3000.
All state is in-memory and resets on restart — deliberate.

**Work on a branch: `feat/zomato-module-depth`. Never commit to `main`.**
**Never start the servers** (`mvn spring-boot:run`, `npm run dev`, `./start.sh`). Build and test only.
**Run every command through WSL** (`wsl <command>`) — the repo is on a Windows drive.

Read `CLAUDE.md` and `AGENTS.md` for repository conventions before you start. The reference
modules are `splitwise`, `logging`, `uber` and `restaurant` — match their depth. `uber` in
particular solved the exact same race you are about to fix here; copy its shape.

## Where zomato stands today

| | |
|---|---|
| Backend files | 16 (`model/`, `repository/`, `service/`, `controller/`, `config/`) |
| Tests | 3, in one class |
| `/sim/*` endpoints | 0 |
| Exception package | none — throws `IllegalStateException` / `IllegalArgumentException` |
| Strategy package | none |
| Lombok | not used; every model has hand-written accessors |
| `OrderStatus` | a bare enum with no transition table |
| Frontend | `ZomatoPage.jsx`, 1,655 lines — the richest scene in the repo. **Keep it.** |

---

## 1. The defect to fix first — a live check-then-act race

`ZomatoService.markReadyForPickup(...)`, around line 183:

```java
List<DeliveryAgent> availableAgents = repository.getAvailableDeliveryAgents();  // check
if (!availableAgents.isEmpty()) {
    DeliveryAgent agent = availableAgents.get(0);
    agent.setAvailable(false);                                                   // act
```

Two orders reaching READY_FOR_PICKUP concurrently can be handed **the same delivery agent**.
`ConcurrentHashMap` makes each `get` and each `put` atomic; it cannot make a read-decide-write
*sequence* atomic.

**Fix:** a new `service/DeliveryAssignmentService` holding a per-agent lock, exactly like
`com.lld.uber.service.DriverAssignmentService`:

```java
private final ConcurrentMap<String, ReentrantLock> agentLocks = new ConcurrentHashMap<>();
private ReentrantLock lockFor(String agentId) {
    return agentLocks.computeIfAbsent(agentId, k -> new ReentrantLock());
}
```

`assignAgent(String orderId)` walks the candidate agents and, for each, takes that agent's lock and
re-checks availability **inside** the lock before claiming. Per-agent locks, never one global lock —
two orders assigning two different agents must proceed in parallel, and a test asserts that.

`releaseAgent(String agentId)` takes the same lock, sets available, and is null-safe.

---

## 2. `OrderStatus` transition table

Replace the bare enum with the `RideStatus`/`OrderStatus` shape used by uber and restaurant.

| from | allowed next |
|---|---|
| PLACED | CONFIRMED, CANCELLED |
| CONFIRMED | PREPARING, CANCELLED |
| PREPARING | READY_FOR_PICKUP, CANCELLED |
| READY_FOR_PICKUP | OUT_FOR_DELIVERY, CANCELLED |
| OUT_FOR_DELIVERY | DELIVERED |
| DELIVERED | *(terminal — empty set)* |
| CANCELLED | *(terminal — empty set)* |

```java
public Set<OrderStatus> allowedNext()          // never null, unmodifiable
public boolean canTransitionTo(OrderStatus to) // false for null
```

Every status change in `ZomatoService` must go through `canTransitionTo` and throw
`InvalidOrderTransitionException` when rejected. **No `setStatus` bypass anywhere.** Note that
cancellation is legal up to and including READY_FOR_PICKUP but not once OUT_FOR_DELIVERY —
that rule is asserted by a test.

---

## 3. Delivery fee Strategy — fixed arithmetic

New package `strategy/`:

```java
public interface DeliveryFeeStrategy {
    String getName();
    double computeFee(double distanceKm, double orderValue);
}
```

Every returned value rounded to 2 decimals (`Math.round(x * 100.0) / 100.0`).

| Strategy | `getName()` | Rule |
|---|---|---|
| `StandardDeliveryFeeStrategy` | `"STANDARD"` | `30.0 + 8.0 * distanceKm` |
| `SurgeDeliveryFeeStrategy` | `"SURGE_<m>x"` e.g. `"SURGE_2.0x"` | standard fee × multiplier |
| `FreeDeliveryStrategy` | `"FREE_ABOVE_500"` | `0.0` |

`SurgeDeliveryFeeStrategy` rejects a multiplier outside **1.0–3.0 inclusive** with
`IllegalArgumentException`, keeping the previous value.

`DeliveryFeeStrategyFactory.forConditions(double orderValue, int pendingOrders, int availableAgents)`:

1. `orderValue >= 500.0` → `FreeDeliveryStrategy`
2. else `availableAgents == 0` **or** `pendingOrders >= availableAgents * 3` → surge at **2.0x**
3. else → `StandardDeliveryFeeStrategy`

**Worked examples the tests must assert:**

| distance | orderValue | pending | agents | expected fee | strategy |
|---|---|---|---|---|---|
| 5 km | 300 | 1 | 4 | `70.00` | STANDARD |
| 5 km | 300 | 12 | 4 | `140.00` | SURGE_2.0x |
| 5 km | 600 | 12 | 4 | `0.00` | FREE_ABOVE_500 |
| 0 km | 300 | 1 | 4 | `30.00` | STANDARD |
| 2.5 km | 300 | 1 | 4 | `50.00` | STANDARD |

Boundaries also asserted: `orderValue == 500.0` is free; `pendingOrders == availableAgents * 3`
surges; `availableAgents == 0` surges regardless of pending count.

---

## 4. Exceptions — new package `com.lld.zomato.exception`

`ZomatoException extends com.lld.config.DomainException` — the base, **no `@ResponseStatus`**,
never thrown directly. Concrete types, each `extends ZomatoException` with `@ResponseStatus`:

| Class | Status |
|---|---|
| `RestaurantNotFoundException` | 404 NOT_FOUND |
| `CustomerNotFoundException` | 404 NOT_FOUND |
| `OrderNotFoundException` | 404 NOT_FOUND |
| `MenuItemNotFoundException` | 404 NOT_FOUND |
| `DeliveryAgentNotFoundException` | 404 NOT_FOUND |
| `InvalidOrderTransitionException` | 409 CONFLICT |
| `MenuItemUnavailableException` | 409 CONFLICT |
| `NoAgentAvailableException` | 409 CONFLICT |
| `PaymentFailedException` | 422 UNPROCESSABLE_ENTITY |

No 5xx is permitted — a guard-rail test fails the build if any domain exception maps to 5xx.
Replace the existing `IllegalStateException` / `IllegalArgumentException` throws in
`ZomatoService` with these. Copy the shape of `com.lld.uber.exception.UberException`.

**Naming collision warning:** `GlobalExceptionHandlerTest` wildcard-imports several modules'
exception packages, and `restaurant` already declares `OrderNotFoundException` and
`MenuItemNotFoundException`. Adding zomato's wildcard import will make those ambiguous and the
test will not compile. **Convert that test file's imports to explicit single-type imports** as
part of this work — do not rename zomato's exceptions to dodge it.

---

## 5. Lombok on the models

`Customer`, `DeliveryAgent`, `DeliveryPartner`, `MenuItem`, `Notification`, `Order`, `OrderItem`,
`Payment`, `Restaurant` currently carry hand-written accessors. Replace with
`@Getter @Setter @NoArgsConstructor @AllArgsConstructor` (and `@Builder` where a constructor call
site would otherwise take more than four arguments). Lombok is already an optional-scope
dependency. Do not change field names or JSON shape — the 1,655-line frontend reads them.

---

## 6. The isolated `/sim/*` engine

Zomato has none. Follow `SplitwiseService` and `RestaurantService`: the service holds **a second
repository instance** (`private final ZomatoRepository simRepository = new ZomatoRepository();`)
plus its own assignment service over that sandbox, a
`private final List<ZomatoEvent> simEventLog = new CopyOnWriteArrayList<>();` and a parallel set of
`sim*` methods that touch only those. The demo must never mutate the data the operational tabs show.

| Method | Path |
|---|---|
| POST | `/api/zomato/sim/reset` |
| GET | `/api/zomato/sim/state` — `{ restaurants, orders, agents }` |
| POST | `/api/zomato/sim/order` |
| POST | `/api/zomato/sim/confirm` |
| POST | `/api/zomato/sim/prepare` |
| POST | `/api/zomato/sim/ready` — assigns an agent |
| POST | `/api/zomato/sim/deliver` |
| POST | `/api/zomato/sim/cancel` — rejected once OUT_FOR_DELIVERY |
| POST | `/api/zomato/sim/race` — N orders contending for one agent |
| GET | `/api/zomato/sim/events` |

`ZomatoEvent` is a model record: `id (long), type (String), actor (String), message (String),
detail (Map<String,Object>), timestamp (Instant)`. Every sim action appends one.

**`/sim/race` matters** — it is what makes the lock visible in the UI. Copy
`RestaurantService.simRace`: N threads released together by a `CountDownLatch`, all trying to claim
the same agent, returning `{ agentId, attempts, winner, rejected, results[] }` where each result row
carries `waiter`-equivalent (`order`), `outcome` (`WON`/`REJECTED`) and a human `reason`.

Values passed to `Map.of(...)` must never be null — `Map.of` throws on null, which is how a 4xx
turned into a 500 in this repo before (see RCA in `RCA.md`).

---

## 7. Frontend

`ZomatoPage.jsx` is 1,655 lines and the best scene in the repo — the night city map, kitchen smoke
and moving scooter all stay. **Do not rewrite the visuals.**

- Add the `/sim/*` wrappers to `frontend/src/lld/zomato/api.js`.
- Rewire the simulation tab so each step calls the backend instead of advancing local React state.
  Every number rendered must have come from an API response.
- Add a **telemetry HUD** (order status, assigned agent, available agents, delivery fee, active
  strategy, event count) and a **step indicator** using the shared `.step-indicator` / `.step-dot`
  classes.
- The step sequence must include **contention** (`/sim/race`, showing which order got the agent and
  why the others were refused) and **a failure path** (cancel once OUT_FOR_DELIVERY → 409).
- Steps advance only on user click. No autoplay timers.
- Use `var(--bg-primary)`, `var(--text-primary)`, `var(--border-primary)` etc. from
  `src/styles/theme.css`. The night-map canvas may keep its fixed dark surface, but it must carry
  its own readable foreground colours — never let theme-dependent text land on a fixed background.
- `LldPage` renders the `design` and `diagram` tabs itself; do NOT render `<ClassDiagram>` for them.

---

## 8. Two mandatory edits to existing shared tests

Guard-rails, not obstacles. Skipping them turns the build red.

1. **`backend/src/test/java/com/lld/config/DomainExceptionContractTest.java`** — add
   `"ZomatoException"` to the `BASES` set. Module bases carry the hierarchy and are never thrown
   directly, so they carry no `@ResponseStatus`.
2. **`backend/src/test/java/com/lld/config/GlobalExceptionHandlerTest.java`** — add one
   `Arguments.of(...)` row per new concrete exception with its expected status, **and** convert the
   file's wildcard imports to explicit ones (section 4).

---

## 9. Tests — four flavours, `backend/src/test/java/com/lld/zomato/`

Model them on `com.lld.uber.*Test` and `com.lld.restaurant.*Test`. Keep the existing 3 tests
passing — do not delete or weaken them.

**`ZomatoServiceTest`** (~25) — the order lifecycle end to end; ordering an unavailable menu item;
unknown restaurant/customer/order; cancel legal through READY_FOR_PICKUP and refused once
OUT_FOR_DELIVERY; delivery completes and frees the agent; no agent available path; notification
fan-out on each transition.

**`DeliveryFeeStrategyTest`** (~14) — the table in section 3 pinned exactly, both boundaries,
zero distance, rounding to paise, multiplier bounds 1.0–3.0 rejected outside with the old value
surviving, factory resolution for all three branches, and the `getName()` strings.

**`OrderStatusTest`** (~12) — the transition table exhaustively, plus a
`@ParameterizedTest @EnumSource` asserting every constant declares a non-null set, rejects `null`,
has no self-transition, and returns an unmodifiable set.

**`ZomatoConcurrencyTest`** (~7) — `CountDownLatch` start/done, bounded
`await(5, TimeUnit.SECONDS)`, assert invariants not timings:
- `twoOrdersRacingForOneAgent_onlyOneWins`
- `twentyOrdersOneAgent_nineteenRejected`
- `disjointAssignmentsAllSucceed` — 6 orders, 6 agents, **all 6 must win** (proves per-agent locks)
- `repeatedRaceNeverProducesTwoWinners` — the 2-order race **300 times**, fresh state each round
- `releasedAgentCanBeReclaimedOnce`
- `releaseIsNullSafe`
- `simRace_alwaysProducesExactlyOneWinner` — 25 rounds against `/sim/race`

### 9.1 Verify the race test actually detects the race — not optional

A concurrency test that passes against broken code is worse than no test.

1. Temporarily comment out `lock.lock()` / `unlock()` in `DeliveryAssignmentService`.
2. **Insert `Thread.sleep(2)` BETWEEN the availability check and the write** — not before the check.
   This exact mistake produced a false negative on the uber module: the unguarded window is only
   nanoseconds wide, so a delay before the check widens nothing and the suite passes against
   genuinely broken code.
3. Run `mvn test -Dtest=ZomatoConcurrencyTest`. It **must go red**. If it stays green the test is
   worthless — fix the test, not the assertion.
4. Restore the file (`git checkout -- <file>`) and confirm green again.

**Report the exact failure output you saw at step 3.** If you cannot make it fail, say so explicitly
rather than claiming verification.

---

## 10. Docs

- `AGENTS.md` — rewrite the Zomato backend section to describe the transition table, the Strategy
  and factory, the per-agent lock and the race it closes, the exception hierarchy with statuses,
  and the test classes.
- `README.md` — update the Zomato feature list and its pattern row.
- `RCA.md` — add a six-section entry for the delivery-agent race: Overview & Severity, Symptoms &
  Error Logs, Root Cause, Diagnostic Commands, Step-by-Step Resolution, Preventative Measures.
  Follow the existing RCA-006 entry as the model, including its note about the false negative.
- Do **not** touch `frontend/src/data/design/zomato.js` or `frontend/src/data/diagrams/zomato.js` —
  they will be reconciled separately.

---

## 11. Acceptance — all of these must pass before handing back

```bash
# from backend/
mvn test          # whole suite green; 372 tests today, expect roughly 430 after this work
mvn package

# from frontend/
npx vitest run    # 250 tests green
npm run build     # entry chunk must stay under 500 kB (~260 kB today; CI gates this)
```

Do not weaken, skip or delete an existing test to make new work pass. If an existing test fails,
that is a finding — report it, don't silence it.

Conventional commit messages. Push the branch and open a PR against `main`. **Do not merge it.**

## 12. Report back with

- Files created vs. modified
- Final test counts from both suites, pasted from real output
- The exact failure you saw at step 9.1 with the lock removed
- Anything in this spec you could not implement as written, and why

## 13. Known trap

A single hard `javac` error aborts Lombok's annotation processing, producing a flood of spurious
"cannot find symbol" errors on generated getters and setters in unrelated files. **Fix the first
real error and the rest disappear** — do not chase them individually. This will bite during
section 5.
