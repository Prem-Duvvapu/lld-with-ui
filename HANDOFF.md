# HANDOFF — Implementation Prompts for the Remaining Work

> **This file is temporary scaffolding, not project documentation.**
> It exists so implementation work can be handed to another agent without losing context.
> **Delete it once Phases 2–4 are complete** (`git rm HANDOFF.md`) — the durable versions of
> everything here live in `AGENTS.md` (conventions), `README.md` (what each module is), and
> `RCA.md` (what broke and why). Keeping a stale handoff file around is worse than not having one.

**Status at time of writing (2026-08-20):** Phases 0 and 1 are complete — 4 commits on
`fix/phase0-1-stabilize-and-harden`, not yet on `main`. Backend 203 tests green, frontend 250
tests green, `mvn package` and `vite build` clean, 16 defects closed.

## How to use this file

1. Paste the **Context Preamble** below into the agent.
2. Then paste **one** task prompt (A–G). One prompt per session; they are sized to be done well, not fast.
3. Ask for the per-module checklist against the 17 criteria when it reports back.

**Every prompt assumes the git workflow in the preamble:** branch off `main`, open a PR, and merge
only after CI is green. Nothing goes to `main` directly.

| Prompt | Scope | Modules | State |
|---|---|---|---|
| A | Land Phase 0/1, CI gate, housekeeping | — | Pending |
| B | Wave 2A — highest interview value | 5 | Pending |
| C | Wave 2B — advertised-but-absent patterns | 6 | Pending |
| D | Wave 2C — games, chess first | 4 | Pending |
| E | Wave 3A — new domain backends | 6 | Pending |
| F | Wave 3B — concurrency primitives | 9 | Pending |
| G | Phase 4 — portfolio finish | — | Pending |

**Already done — do not redo:** the error contract (`DomainException` / `GlobalExceptionHandler` /
`ErrorResponse`), the per-module design-data split, the shared `moduleKeys.js` resolver, SPA
code-splitting, the CI workflow, and the 16 defects logged in `RCA.md` (RCA-002 … RCA-005).

---

## Context Preamble

*Paste this above every task prompt.*

```text
You are working in the `lld-with-ui` repo: a Low-Level-Design portfolio of 45 interactive
modules, each with a Java backend, a React UI, a class diagram and a design write-up.

## Stack and layout

- Backend: Java 17 + Spring Boot 3.2, single JAR, port 9090. All code under
  `backend/src/main/java/com/lld/<module>/`. In-memory only (ConcurrentHashMap +
  ReentrantLock) — there is no database, and state resets on restart.
- Frontend: React 19 + Vite + React Router 7, port 3000 (pinned in vite.config.js).
  One folder per module: `frontend/src/lld/<module>/<Name>Page.jsx` + `api.js`.
- API calls go through the shared helper: `import { apiFetch } from '../../utils/api'`.
  It prefixes `/api`, so call `apiFetch('/uber/rides')`, not the full URL.
- Every controller is `@RestController @RequestMapping("/api/<module>") @CrossOrigin(origins = "*")`.

## Module layering (follow this exactly)

    com/lld/<module>/
      controller/    <- transport only; no business logic
      service/       <- the facade service owns ALL business logic
      model/         <- entities + enums
      repository/    <- in-memory store
      exception/     <- module exception hierarchy
      <pattern>/     <- one package per design pattern actually used:
                        strategy/ factory/ observer/ state/ command/ decorator/ chain/

## Error contract — ALREADY BUILT, use it, don't reinvent it

- A module's base exception extends `com.lld.config.DomainException`.
- Each CONCRETE exception carries `@ResponseStatus(HttpStatus.X)`. Conventions:
  400 invalid input/rejected transition · 401/403 auth · 404 unknown id ·
  409 conflict/quota/uniqueness · 410 expired hold · 422 understood but unexecutable.
- `com.lld.config.GlobalExceptionHandler` resolves the status and returns
  `com.lld.config.ErrorResponse` — `{ error, code, status, timestamp }`.
- NEVER write `Map.of("error", e.getMessage())`. `Map.of` rejects nulls and
  `getMessage()` is null for NPEs, so the handler itself throws and returns 500.
  Use `ErrorResponse.of(e)` or `ErrorResponse.messageOf(e)`.
- A domain exception must never map to a 5xx. `DomainExceptionContractTest`
  classpath-scans and fails the build if one does, or if one lacks @ResponseStatus.

## Design data — one file per module

- `frontend/src/data/design/<module>.js`   — requirements, entities, designPatterns,
  principles, oopConcepts, extensibility, tradeoffs, title, tldr
- `frontend/src/data/diagrams/<module>.js` — title, classes[{name, stereotype, fields, methods}],
  relationships[{from, to, label}]
- Register each in the barrel: `frontend/src/data/designDetails.js` / `classDiagrams.js`.
- NEVER add a second key for the same module. A single shared object literal previously let
  JavaScript silently discard the richer duplicate at parse time (see RCA-002).
- Module-id lookup goes through `frontend/src/data/moduleKeys.js` (`resolveModuleData`).
  Add new spellings to its ALIAS_MAP, never to a component.
- Every `relationships` endpoint MUST match a declared class `name` — the renderer
  silently drops edges that don't, and a test enforces it.

## Reference modules — copy these, they set the bar

- Backend depth:  `com/lld/splitwise/` (Strategy + Factory, 4 test classes, 26 tests)
                  `com/lld/logging/`   (Chain of Responsibility + Strategy + Observer, async)
- Frontend depth: `frontend/src/lld/uber/UberPage.jsx` (6 tabs, interactive 2D scene)
                  `frontend/src/lld/zomato/ZomatoPage.jsx`
- Seat/hold concurrency: `com/lld/movieticket/` and `com/lld/airline/`
  (per-seat ReentrantLock keyed `id:seat`, ascending lock order, TTL holds)

## Definition of done — 17 criteria, all required

Backend
 1. Layered packages as above, plus a package per pattern actually used.
 2. Facade service owns all logic; controller only translates HTTP.
 3. At least one GoF pattern implemented end to end — real, not a class named after it.
 4. Thread safety with intent: ConcurrentHashMap store, ReentrantLock for compound
    mutations, and a comment stating the lock ordering where more than one lock is held.
 5. An isolated `/api/<module>/sim/*` engine: reset, per-step actions, an event log and
    snapshots, operating on state SEPARATE from the live module state.
 6. Typed enums instead of string literals.
 7. Lombok models (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`).
 8. Exception hierarchy on the contract above.
 9. Tests in four flavours: service, strategy/unit, repository, concurrency.

Frontend
10. `<Name>Page.jsx` + `api.js` using the shared `apiFetch`.
11. 5–6 tabs: two or three operational tabs, then Simulation, Class Diagram, Design Details.
12. An 8-step interactive 2D simulation scene driven by the `/sim/*` endpoints, with a
    live telemetry HUD, in the style of the uber and zomato pages.
13. Live polling of server state via `frontend/src/hooks/usePolling.js`.
14. A full `data/design/<module>.js`.
15. A `data/diagrams/<module>.js`.
16. Theme tokens only — `var(--bg-primary)`, `var(--text-primary)` etc. from
    `src/styles/theme.css`. No literal colours; both light and dark must work.

Docs
17. Update `AGENTS.md` (module section), `README.md` (table row + detail section), and add an
    `RCA.md` entry for any non-trivial bug you diagnose and fix along the way. RCA entries need
    all six sections: Overview & Severity, Symptoms & Logs, Root Cause, Diagnostics,
    Resolution, Prevention.

## Hard rules

- NEVER start the backend or frontend yourself. The user runs servers manually.
  You may run `mvn test`, `mvn package`, `npx vitest run` and `npm run build`.
- Run all commands through WSL.
- Both suites must stay green: `cd backend && mvn test` (203 tests now) and
  `cd frontend && npx vitest run` (250 now). Never delete or weaken an existing test
  to make yours pass.
- `frontend/src/__tests__/designDataCoverage.test.js` holds a `PENDING_DESIGN_CONTENT`
  allowlist. When you add design content for a listed module, REMOVE it from that list —
  a test asserts the list stays honest and will fail if you don't.
- CI (`.github/workflows/ci.yml`) runs both suites, `mvn package`, `vite build`, and an
  entry-chunk size budget on every push and PR. It must be green before anything merges.
- Conventional commits, one commit per module: `feat(uber): ...`, `test(chess): ...`.
- GIT WORKFLOW — required, no exceptions:
    1. Branch off main:  git checkout main && git pull && git checkout -b <type>/<slug>
    2. Commit your work on that branch. NEVER commit to main directly.
    3. Push and open a PR:  gh pr create --base main --fill
    4. CI (.github/workflows/ci.yml) must be green — both suites, mvn package, vite build,
       and the entry-chunk size budget. A red build never merges.
    5. Merge only once every check passes, then delete the branch.
  Run the suites locally BEFORE opening the PR so CI confirms rather than discovers.
- Report honestly. If something is incomplete, say which part and why.
```

---

## Prompt A — Land Phase 0/1, enforce CI, clear housekeeping

```text
Task: land the completed Phase 0/1 work, make CI actually gate merges, and clear two small
housekeeping items.

Current state: branch `fix/phase0-1-stabilize-and-harden` has 4 commits that are not on
`main`. Working tree is clean. Both suites are green (backend 203, frontend 250).

1. Verify before merging. Run `cd backend && mvn test`, `cd frontend && npx vitest run`,
   and `npm run build`. All must pass. Report the numbers.

2. Confirm the CI workflow is correct. `.github/workflows/ci.yml` already exists and runs
   two jobs — "Backend — mvn test" (mvn test + package) and "Frontend — vitest + build"
   (npm ci, vitest, build, entry-chunk size budget) — triggered on push to any branch and on
   pull requests. Read it and confirm it is sound. Fix anything wrong, but do not remove the
   entry-chunk size check: it guards the specific regression that put all 45 module pages in
   a single 1,474 kB bundle, and no other test covers bundle size.

3. Make CI BLOCK merges to main. This is the actual gap — the workflow runs, but nothing
   requires it to pass before a merge. Open a PR for the branch and enable branch protection
   on `main` requiring both status checks:

     gh pr create --base main --head fix/phase0-1-stabilize-and-harden \
       --title "Phase 0/1: stabilize and harden" --body "See RCA-002..RCA-005."

     gh api -X PUT repos/:owner/:repo/branches/main/protection \
       -H "Accept: application/vnd.github+json" \
       -f 'required_status_checks[strict]=true' \
       -f 'required_status_checks[contexts][]=Backend — mvn test' \
       -f 'required_status_checks[contexts][]=Frontend — vitest + build' \
       -F 'enforce_admins=false' \
       -F 'required_pull_request_reviews=null' \
       -F 'restrictions=null'

   The check context names must match the `name:` values in ci.yml exactly, or protection
   will wait forever on a check that never reports. Verify with
   `gh api repos/:owner/:repo/branches/main/protection` and confirm on the PR that both
   checks appear and are required. If the API call fails on plan or permission grounds,
   say so and give the user the exact click-path in Settings → Branches instead.
   Then merge the PR once both checks are green.

4. Remove the unused dependency. `framer-motion` is declared in `frontend/package.json` but
   imported by no source file — verify with `grep -rn "framer-motion" frontend/src` returning
   nothing, then remove it, run `npm install` to regenerate `package-lock.json`, and confirm
   `npm run build` and `npx vitest run` still pass.
   Commit as `chore(frontend): drop unused framer-motion`.

5. Consider lazy-loading the design-data barrel. `frontend/src/data/designDetails.js` and
   `classDiagrams.js` import all ~36 module files eagerly, so opening any Design Details tab
   pulls a ~300 kB shared chunk. It is off the entry path, so this is an improvement rather
   than a defect. Investigate `import.meta.glob` without `eager` plus async resolution in
   `DesignDetails.jsx` / `ClassDiagram.jsx` with a Skeleton fallback.
   IMPORTANT: `designDataCoverage.test.js` resolves this data synchronously and would need
   reworking. If that costs more clarity than the ~300 kB is worth, say so and leave it
   alone — that is an acceptable outcome. Do not half-do it.

Definition of done: branch merged via a PR that CI gated, branch protection verified,
framer-motion gone, both suites green, and a clear recommendation on item 5 with reasoning.
```

---

## Prompt B — Wave 2A: the five highest-value modules

```text
Task: raise five existing modules to the 17-criteria bar in the preamble. These already have
working backends and UIs — you are deepening them, not starting over. One commit per module,
in this order. Run both suites after each module and keep them green.

Do Uber FIRST. The user cites it as their reference module, and it is currently the biggest
mismatch in the repo: the best frontend sitting on a backend with zero tests.

--- 1. uber (15 java files, 0 sim endpoints, 0 tests) ---
Gaps: no `/sim/*` engine at all; NO TESTS; Strategy and State exist only as inline logic
inside `UberService` — there are no pattern packages.
Do: extract pricing into `strategy/` (a `FarePricingStrategy` with at least a normal and a
surge implementation), model the ride lifecycle explicitly (RideStatus already exists:
REQUESTED, ACCEPTED, ONGOING, DESTINATION_REACHED, PAYMENT_PENDING, COMPLETED,
PAYMENT_FAILED, CANCELLED) with guarded transitions that reject illegal ones; add a typed
exception hierarchy on the error contract; add `/sim/*` (reset, request, accept, verify-otp,
arrive, complete, cancel, events, snapshots) over isolated state; convert models to Lombok;
add the four test flavours including a concurrency test for two riders racing for one driver.
Rewire the existing 2D city-map simulation tab to drive the new `/sim/*` endpoints instead of
local React state.

--- 2. zomato (16 java files, 3 sim endpoints, 3 tests) ---
Gaps: the repo's richest frontend (1,655 lines) on a 3-test backend; no pattern packages;
partial `/sim` surface.
Do: extract the payment methods into a real `strategy/` package (UPI, CREDIT_CARD,
DEBIT_CARD, WALLET, CASH_ON_DELIVERY), formalise the OrderStatus state machine with
transition guards, complete the `/sim/*` engine, typed exceptions, Lombok, four test
flavours including a concurrency test for concurrent orders against limited stock.

--- 3. stackoverflow (15 java files, 0 sim, 0 tests) ---
Gaps: no tests, no sim, no exceptions. Reputation and voting rules are completely untested,
and they are the interesting part of this design.
Do: a `strategy/` package for reputation scoring, typed exceptions, `/sim/*`, Lombok, and
tests that pin the voting and reputation rules precisely — upvote/downvote deltas, accepted
answer bonus, self-vote rejection, and vote-change idempotency.

--- 4. tictactoe (11 java files, 0 sim, 5 tests) ---
Gaps: Minimax is already tested; missing `/sim/*` and typed exceptions.
Do: add `/sim/*` driving the existing simulation tab, typed exceptions, Lombok, and extend
tests to cover the UNBEATABLE difficulty never losing from an empty board and from a
mid-game fork.

--- 5. hotel (7 java files, 0 sim, 6 tests) ---
Gaps: only 7 files for a booking domain — no state machine, no strategy, no concurrency
story at all, which is the whole point of a room-booking design.
Do: a real reservation state machine, a `strategy/` package for tariffs and cancellation
refunds, per-room locking that prevents double-booking overlapping date ranges, typed
exceptions, `/sim/*`, Lombok, and a concurrency test firing N threads at the last available
room for overlapping dates, asserting exactly one wins.

For each module also deliver: the 8-step simulation tab wired to `/sim/*`, updated
`data/design/<module>.js` and `data/diagrams/<module>.js`, and the doc updates.
Report a per-module checklist against the 17 criteria, marking anything you did not do.
```

---

## Prompt C — Wave 2B: the six advertised-but-absent pattern gaps

```text
Task: raise six existing modules to the 17-criteria bar in the preamble. Each has a specific
gap where README.md already claims a pattern the code does not implement — closing that gap
is the point of this wave. One commit per module; keep both suites green.

--- 1. inventory (7 files, 0 sim, 0 tests) ---
README claims Observer + Strategy; neither exists. Inventory is the textbook Observer case.
Do: an `observer/` package where low-stock crossings notify registered observers (in-app +
logging), a `strategy/` for reorder policy, typed exceptions, `/sim/*`, Lombok, and a
concurrency test for simultaneous stock decrements never dropping below zero.
Note: `data/diagrams/inventory.js` already exists and is accurate — extend, don't replace.

--- 2. digitalwallet (6 files, 0 sim, 0 tests) ---
README claims Command Pattern + transactional locking; neither exists. This handles money
with no concurrency test.
Do: a `command/` package for wallet operations (credit, debit, transfer) with an execution
log, deadlock-free two-account transfer locking via ascending account-id lock ordering,
typed exceptions, `/sim/*`, Lombok, and a concurrency test hammering concurrent transfers
between two wallets that asserts the total balance is conserved exactly.

--- 3. trafficsignal (6 files, 0 sim, 0 tests) ---
README claims State + Observer + timer transitions; none exist.
Do: a `state/` package for signal phases with timed transitions, an `observer/` for phase
change broadcasts, an emergency-override path, typed exceptions, `/sim/*`, Lombok, tests
including a deterministic injectable clock so timing is testable without sleeping.

--- 4. taskmanagement (7 files, 0 sim, 0 tests) ---
Status workflow with no State pattern and no transition guards.
Do: a `state/` package with guarded transitions that reject illegal moves, a `strategy/` for
priority ordering, typed exceptions, `/sim/*`, Lombok, four test flavours.

--- 5. auction (7 files, 0 sim, 0 tests) ---
Concurrent bidding with no lock story and no concurrency test — the core risk of this design.
Do: per-auction locking so concurrent bids serialise correctly, an `observer/` for outbid
notifications, a `strategy/` for bid validation and auto-increment, auction lifecycle guards,
typed exceptions, `/sim/*`, Lombok, and a concurrency test firing N simultaneous equal bids
asserting exactly one wins and the rest are rejected as outbid.

--- 6. socialnetwork (7 files, 0 sim, 0 tests) — SPECIAL CASE ---
The backend exists and is served at `/api/social`, but the UI never calls it:
`frontend/src/lld/social-network/SocialNetworkPage.jsx` has no `api.js` and mocks the whole
feed in React state.
Do: FIRST write `frontend/src/lld/social-network/api.js` against the real endpoints and
rewire the page to the backend. Then bring the backend to the bar: an `observer/` for feed
fan-out, typed exceptions, `/sim/*`, Lombok, and tests including concurrent friend-request
handling using canonical pair locking (see `com/lld/linkedin/` for the established pattern:
`min(u1,u2) + "#" + max(u1,u2)`).

For each module also deliver the 8-step simulation tab, the design-data files, and the doc
updates. Report a per-module checklist against the 17 criteria.
```

---

## Prompt D — Wave 2C: the four games, chess first

```text
Task: raise the four game modules to the 17-criteria bar in the preamble. One commit per
module; keep both suites green.

Do chess FIRST and treat it as primarily a testing job. Move validation and checkmate
detection is the single largest body of completely untested logic in this repo, and it is
pure unit-test territory — no concurrency, no I/O, just rules.

--- 1. chess (8 files, 0 sim, 0 tests) ---
Do: write tests BEFORE refactoring, so you pin current behaviour and discover real bugs.
Cover per piece: legal move sets, blocked paths, captures, pawn promotion and the two-square
opening, castling (including "cannot castle through or out of check"), en passant, check
detection, checkmate, stalemate, and rejection of any move leaving your own king in check.
Use FEN-style or explicit board setups so each case is readable. EXPECT TO FIND BUGS —
report each, fix it, and add an RCA.md entry for any non-trivial one.
Then: a `strategy/` package for move generation per piece type, a `command/` package for
move/undo, typed exceptions, `/sim/*`, Lombok.

--- 2. minesweeper (6 files, 0 sim, 0 tests) ---
Flood-fill reveal is untested. Do: tests for flood-fill on an empty region, boundary
behaviour at grid edges, first-click-never-a-mine if that is the intent (decide and
document), flagging, win detection, and loss on a mine. Then typed exceptions, `/sim/*`,
Lombok, and a deterministic seeded board generator so tests are reproducible.

--- 3. snakeladders (9 files, 0 sim, 0 tests) ---
Do: a seeded/injectable dice so outcomes are deterministic in tests, tests for exact-win
requirements, snake and ladder chains, multi-player turn order, typed exceptions, `/sim/*`,
Lombok.

--- 4. ludo (7 files, 0 sim, 0 tests) ---
Do: a `state/` package for turn and token lifecycle, seeded dice, tests for captures, safe
squares, the roll-a-six-to-leave-home rule, and exact-count home entry, typed exceptions,
`/sim/*`, Lombok.

For each module also deliver the 8-step simulation tab wired to `/sim/*`, the design-data
files, and the doc updates. Report a per-module checklist against the 17 criteria, and list
every bug the new tests exposed.
```

---

## Prompt E — Wave 3A: six new domain backends from scratch

```text
Task: build six modules that currently have NO backend at all. Each has only a small React
page that mocks its behaviour in local state (97–181 lines). Build the full backend to the
17-criteria bar in the preamble, then rewrite the page as a real API client.

Two things make this cheaper than it sounds:
- The existing mock pages are useful specifications. Read each one first — it shows the
  intended flow, entities and vocabulary. Preserve that vocabulary.
- `data/design/<module>.js` ALREADY EXISTS for all six with requirements, entities and
  patterns written. Treat it as the spec, and update it only where the build diverges.

Three of these reuse concurrency designs already proven in this repo. Study
`com/lld/movieticket/SeatLockManager` and `com/lld/airline/service/SeatLockManager` before
starting: per-seat `ReentrantLock` keyed `"<id>:<seat>"`, multi-seat acquisition in ascending
order to prevent circular wait, and a TTL hold that a sweep expires.

--- 1. concert-ticket ---  Reuses the seat-lock design directly. Venue sections, seat holds
with TTL, dynamic pricing per section, waitlist. Concurrency test: N threads for one seat,
exactly one wins.

--- 2. course-registration ---  The same lock shape applied to seat COUNTS rather than named
seats. Capacity races, waitlist promotion on drop, prerequisite checking, schedule conflict
detection. Concurrency test: N students racing for the last seat in a section.

--- 3. car-rental ---  Overlapping-INTERVAL reservation locking, the interesting variation:
two bookings conflict if their date ranges intersect, so the lock is per-vehicle and the
check is an interval overlap. Fleet across branches, vehicle categories, tiered pricing,
late-return fees. Concurrency test: two overlapping bookings for one vehicle, exactly one wins.

--- 4. restaurant ---  Table reservation plus order/kitchen workflow as an explicit state
machine, menu catalog, billing. Factory for order types.

--- 5. cricinfo ---  The cleanest Observer fan-out case in the portfolio: ball-by-ball
commentary broadcast to subscribers, with a live scorecard projected from the ball events
rather than stored twice. Model innings, over, wicket and extras types as enums.

--- 6. music-streaming ---  Catalog, playlists, and subscription tiers as a Strategy
(FREE with ads and skip limits vs PREMIUM), plus a recommendation strategy.

For each module: full backend layering, one or more real GoF patterns, typed exceptions on
the error contract, an isolated `/sim/*` engine, Lombok models, the four test flavours, a
rewritten page with 5–6 tabs including the 8-step simulation, `data/diagrams/<module>.js`
(some already exist — check before writing), and the doc updates.

Report per module against the 17 criteria.
```

---

## Prompt F — Wave 3B: nine concurrency primitives with real thread traces

```text
Task: implement the nine concurrency primitives as real Java that actually runs threads and
records a timestamped execution trace, then have the existing React scenes replay the real
trace instead of animating a fake one. Today all nine are pure React animations with no
backend, which is the weakest part of the portfolio precisely where interviewers probe
hardest.

Structure (decided — do NOT create nine top-level modules, it reads badly on a repo tour):

    backend/src/main/java/com/lld/concurrency/
      controller/ConcurrencyController.java     -> /api/concurrency/**
      model/       TraceEvent, TraceResult, RunRequest
      service/     ConcurrencyRunService  (dispatches to a primitive, collects the trace)
      primitive/   FooBarPrinter, ZeroEvenOdd, FizzBuzzPrinter, H2OBuilder,
                   TtlCache, StripedConcurrentHashMap, BoundedBlockingQueue,
                   ConcurrentBloomFilter, ParallelMergeSort

The trace is the whole point. Each primitive records, per significant step: sequence number,
monotonic nanos-since-start, thread name, the action, and any relevant state (queue depth,
semaphore permits, bit index, partition bounds). Return
`{ result, events[], threadCount, elapsedNanos }` from `POST /api/concurrency/{name}/run`,
with per-primitive params (n, capacity, producers, consumers, ttlMillis, arraySize,
expectedInsertions, ...).

Correctness requirements per primitive — these are the assertions:
- foo-bar: strict "foobar" x n, enforced by two semaphores.
- zero-even-odd: exact "0102030405..." interleave with three threads.
- fizz-buzz: four threads, canonical FizzBuzz output for 1..n, no duplicates or gaps.
- h2o: every group of three consecutive outputs contains exactly two H and one O.
- ttl-cache: real `ScheduledExecutorService` eviction; assert a key is gone after its TTL
  and present before it; no leak of scheduled tasks.
- striped hashmap: lock striping by bucket; assert N threads doing M puts produce exactly
  N*M entries, and that two threads on different stripes genuinely proceed concurrently.
- blocking queue: bounded, `ReentrantLock` + two `Condition`s; assert producers block when
  full and consumers block when empty, and that nothing is lost or duplicated.
- bloom filter: thread-safe bitset, k hashes; assert no false negatives ever, and that the
  observed false-positive rate is within tolerance of the theoretical rate.
- merge sort: `ForkJoinPool` / `RecursiveTask` with a sequential cutoff; assert the result
  matches `Arrays.sort` on randomised input including duplicates and already-sorted input.

Tests: one class per primitive. These must be deterministic — assert invariants (ordering,
conservation, absence of loss) rather than wall-clock timings, and repeat each run where a
race would otherwise be flaky. This is the one module where a flaky test is worse than no
test, so prefer latches and barriers over sleeps.

Frontend: give each of the nine pages an `api.js`, call `/api/concurrency/{name}/run`, and
replay the returned `events[]` in the EXISTING scene with a step scrubber and a thread-lane
timeline. Keep the current visual design; swap the data source.

Design data: all nine are currently in the `PENDING_DESIGN_CONTENT` allowlist in
`frontend/src/__tests__/designDataCoverage.test.js` because they have no content. Write
`data/design/<module>.js` and `data/diagrams/<module>.js` for each AGAINST THE REAL CODE you
just wrote, then REMOVE all nine from that allowlist. A test asserts the list stays honest
and will fail if you leave a covered module in it.

Docs: one AGENTS.md section for the concurrency module, README rows for all nine, and an
RCA.md entry for any genuine race you find and fix while building.
```

---

## Prompt G — Phase 4: portfolio finish

```text
Task: five cleanup items that finish the portfolio. Run only after most of Phases 2 and 3
are done, since several sweep the whole repo. Keep both suites green.

1. Delete the now-redundant controller catch-alls. `GlobalExceptionHandler` maps domain
   exceptions centrally, so ~105 `try { ... } catch (Exception e) { return
   ResponseEntity.badRequest().body(ErrorResponse.of(e)); }` blocks across 16 controllers
   only obscure the real stack trace and flatten every failure to 400. Remove them so
   exceptions propagate to the advice — but module by module, checking each first: some
   catches wrap a genuine fallback or add context (e.g. the coffeemachine and vendingmachine
   handlers that also return `"snapshot"` alongside the error). Keep those, and keep any that
   translate a third-party exception. Verify with the existing tests after each module.

2. Group the OpenAPI spec by tag. There are 412 endpoints across 30 controllers and Swagger
   UI is a flat wall. Add `@Tag(name = "...", description = "...")` per controller and assert
   the grouping against the `/v3/api-docs` JSON in a test rather than opening the UI, since
   you must not start servers.

3. Normalise the seeded demo data. Every module has an initializer and the quality varies;
   some open with data a reader cannot act on. Make each open with a coherent,
   self-explanatory scenario — enough rows to be interesting, few enough to read.

4. Add an api-contract test per module on the frontend. There is currently exactly one
   (`frontend/src/__tests__/parkingApi.test.js`) for 45 modules. Follow its shape: mock
   `fetch`, assert each `api.js` function hits the right method and path and unwraps the
   response. Cheap, and it catches the frontend/backend path drift static review misses.

5. Regenerate the docs from the tree. Re-verify that AGENTS.md and README.md match reality:
   module list, architecture tree, endpoint lists, test counts. These drifted badly before
   (README listed 10 backend modules against 30 real ones), so check rather than assume.

6. Delete this handoff file. Once Phases 2–4 are done, `git rm HANDOFF.md` — its durable
   content now lives in AGENTS.md, README.md and RCA.md.

Report what you changed per item, and anything you deliberately left alone with the reason.
```

---

## Verifying the work that comes back

Independent of what any agent reports:

| Check | Command | Expect |
|---|---|---|
| Backend suite | `cd backend && mvn test` | Grows from 203; 0 failures. A module claimed done with no new test classes did not meet criterion 9. |
| Frontend suite | `cd frontend && npx vitest run` | Grows from 250; 0 failures. Design-data coverage failing means a module was added without content. |
| Bundle budget | `cd frontend && npm run build` | Entry chunk under 500 kB — CI enforces it. A jump means something is being imported eagerly again. |
| Sim surface | `grep -rc '"/sim/' backend/src/main/java/com/lld/<module>` | Non-zero for any module claimed done — criterion 5 is the one most likely to be quietly skipped. |
| CI gate | `gh api repos/:owner/:repo/branches/main/protection` | Both check contexts listed as required. |

The single most useful question to ask back: **"show me the per-module checklist against the
17 criteria, and name what you skipped."** Every prompt asks for it, so a report without one
is itself a signal.
