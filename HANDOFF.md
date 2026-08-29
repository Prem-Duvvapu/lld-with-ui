# HANDOFF — Phased plan to raise every remaining module to the reference bar

> **This file is temporary scaffolding, not project documentation.**
> It exists so implementation work can be handed to another agent (or resumed in a later
> session) without losing context. **Delete it once all phases below are complete**
> (`git rm HANDOFF.md`) — the durable versions of everything here live in `AGENTS.md`
> (conventions), `README.md` (what each module is), and `RCA.md` (what broke and why).

**Status at time of writing (2026-08-26, updated):** **Wave 1 (pattern-gap domains) is fully
done** — digitalwallet (PR #28), taskmanagement (PR #29), auction (PR #30), socialnetwork (PR #31)
all merged. Wave 1b (vendingmachine, coffeemachine, trafficsignal — PR #26) is done too, plus a
same-day hotfix (PR #27) for an unthrottled stdout flood in trafficsignal's production logging
observer (RCA-018). **Wave 2 (ludo) is done** — raised to the reference bar (state pattern
for token lifecycle, seeded dice, exception hierarchy, isolated sim engine, tests;
RCA-020/021/022/023). **Wave 3 (concurrency primitives) is also done** — concurrent-hashmap,
bloom-filter, merge-sort all graduated from frontend-only fake animations to real Java backends
with genuine threads (striped-lock map, `BitSet` Bloom filter, `ForkJoinPool` parallel merge sort),
`designDataCoverage.test.js`'s `PENDING_DESIGN_CONTENT` allowlist is now empty, and **all 45
modules have a backend**. Everything from the prior status note
still holds — uber, zomato, stackoverflow, tictactoe, lru-cache, hotel, car-rental, concert-ticket,
course-registration, cricinfo, music-streaming, restaurant, chess, inventory, snakeladders,
minesweeper, and the original six concurrency primitives are all at or near the 17-criteria bar
with verified concurrency tests. Backend suite was 948 tests / frontend 286 at the start of this
session; now at roughly 1278 backend / 304 frontend — rerun both suites to confirm the exact
current count. **Every module touched in Wave 1/2/3 needed a rebase against `main` before
merging** — parallel agents repeatedly landed real conflicts (not just a stale branch) in
`AGENTS.md`/`README.md`/`frontend/src/data/sequenceDiagrams.js`, always purely additive (two new
module sections inserted at the same point), and RCA numbering collided twice (two independent
modules each picked the next number off their own stale `main`) — resolve by renumbering to the
next free slot on current `main`, never by dropping either entry. One landed-but-orphaned branch
(`feat/concurrency-primitives-depth`, PR #36) was force-pushed and re-opened *after* its original
PR (#35) had already been merged from an earlier snapshot of the same branch — confirmed via a
scoped diff that the actual primitive code was byte-identical to what was already on `main`, then
closed #36 without merging to avoid duplicate history. Lesson: once a branch's PR is merged, don't
keep pushing to that same branch name — cut a fresh branch for any follow-up work instead. Land
parallel work one PR at a time, or budget for this rebase step after every merge. Live tracker
(module tier matrix, wave plan, activity log): see the `status-artifact` memory entry for the
current URL.

## What remains — the honest "not ready" list

Verified against the tree on `main` (2026-08-26):

| Wave | Modules | Core gap |
|---|---|---|
| **1 — pattern-gap domains** | ~~digitalwallet, taskmanagement, auction, socialnetwork~~ | Done — PR #28, #29, #30, #31. |
| **1b — single-actor patterns** | ~~vendingmachine, coffeemachine, trafficsignal~~ | Done — PR #26, plus PR #27 hotfix for trafficsignal's log-spam bug (RCA-018). |
| **2 — games** | ~~ludo~~ | Done — raised to the reference bar (state pattern for token lifecycle, seeded dice, exception hierarchy, isolated sim engine, tests; RCA-020/021/022/023). (chess, minesweeper, snakeladders, tictactoe done) |
| **3 — concurrency primitives** | ~~concurrent-hashmap, bloom-filter, merge-sort~~ | Done — PR #35 (real Java backends: striped-lock map, `BitSet` Bloom filter, `ForkJoinPool` parallel merge sort). `PENDING_DESIGN_CONTENT` allowlist is now empty; all 45 modules have a backend. |
| **4 — thin upgrades** | ~~elevator~~, ~~parking~~ | elevator done — raised to the reference bar (LOOK/SCAN + Nearest-Car dispatch strategies behind a factory, declared elevator state machine, exception hierarchy, real observer wiring, isolated sim engine, tests; RCA-026). (lru-cache done) parking done — EnumMap-resolved pricing/spot factories, exception hierarchy, atomic spot-allocation and exit-race fixes with concurrency tests, isolated `/sim/*` engine, legacy `dto`/`ParkingLotDocumentationService` doc-duplication removed, sequence diagram. |
| **5 — sequence diagrams** | every module touched above (+ sweep of the solid tier) | All 45 modules now have `data/sequences/<module>.js`, added in one un-reviewed direct push to `main` (`2f1d52e`, no branch/PR/CI — a real process violation, see RCA-030). A ~22-module spot-check found `atm`, `library`, `shoppingcart` **severely fabricated** (invented architectures/classes that don't exist — all three now fixed) and 7 more with smaller real naming errors (also fixed: `hotel`, `cricinfo`, `course-registration`, `music-streaming`, `car-rental`, `stackoverflow`, `blocking-queue`). **~10 of the 32 newly-added files were never sampled** (`bloom-filter`, `concurrent-hashmap`, `fizz-buzz`, `foo-bar`, `h2o`, `merge-sort`, `zero-even-odd`, `ttl-cache`, and a few others) — run RCA-030's diagnostic grep against each before trusting them. |

**Unverified against the bar** (not tracked in any wave above, no recorded `/audit-lld` pass):
library, shoppingcart. `airline`, `pubsub`, `atm` and `stock-brokerage` were all raised to the
reference bar in this pass:
- `airline` — PR #38 (concurrent seat-hold/booking locking, State + Strategy/Factory, typed
  exceptions, isolated sim engine, tests; RCA-024).
- `pubsub` — typed exception hierarchy completed, `PubSubRepository` wired in for real with a
  composite-key fix, `SubscriberWorker`/backpressure/fan-out proven with real threads and latches,
  8-step sim, sequence diagram (RCA-028) — see `## Pub Sub System Module` in `AGENTS.md`.
- `atm` — hardened from a bare `ATMState` enum + monolithic `BankingService` to a real class-per-state
  session machine (`com.lld.atm.state`), a `BankingRepository`, a second interchangeable dispense
  strategy behind a factory, a completed `AtmException` hierarchy, and a real per-account-lock
  concurrency test proving no overdraw under 10 concurrent withdrawals — see `## ATM Module` in
  `AGENTS.md`.
- `stock-brokerage` — was already the most mature "unverified" module going in (real Strategy/
  Factory/Observer patterns, a typed exception hierarchy, a genuinely isolated `/sim/*` sandbox).
  Closed the remaining gaps: an `OrderExecutionStrategyFactory` (EnumMap-resolved, matching
  `inventory.strategy.ReorderStrategyFactory`), self-trade prevention wired to the previously-dead
  `OrderExecutionException` (plus a real reservation-leak bug that fix uncovered and fixed), Lombok
  across the model package, and a concurrency test suite proving no double-spend/oversell/double-
  fill with real threads. Also rebuilt the frontend onto the shared `LldPage` shell (it previously
  hand-rolled its own dark-only-palette page) and replaced the RCA-030-era fabricated sequence
  diagram with one grounded in the real matching code — see `## Stock Brokerage Module` in
  `AGENTS.md`.
`library` was paused mid-audit (its worktree/branch still hold partial investigation notes — resume
by re-running the same audit-and-harden pass rather than starting over) to keep only one agent
running at a time. `linkedin` and `movieticket` are referenced elsewhere in this doc as pattern
exemplars (canonical pair locking, seat/hold concurrency respectively) and can be treated as
reference-tier. Run `/audit-lld` on the remaining three before assuming they're at the bar.

## How to use this file

One wave per session-sized chunk of work; one branch + one commit per module; PR per wave
(or per module if the wave runs long). Run both suites after each module and keep them green.
The full conventions live in `AGENTS.md`; the 17-criteria definition of done is there too.

---

## Context Preamble

*Paste this above every task prompt.*

```text
You are working in the `lld-with-ui` repo: a Low-Level-Design portfolio of 45 interactive
modules, each with a Java backend, a React UI, a class diagram, a design write-up and
(where covered) a sequence diagram.

## Stack and layout

- Backend: Java 17 + Spring Boot 3.2, single JAR, port 9090. All code under
  `backend/src/main/java/com/lld/<module>/`. In-memory only (ConcurrentHashMap +
  ReentrantLock) — no database, state resets on restart.
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
      exception/     <- module exception hierarchy on the DomainException contract
      <pattern>/     <- one package per design pattern actually used:
                        strategy/ factory/ observer/ state/ command/ decorator/ chain/

## Error contract — ALREADY BUILT, use it

- A module's base exception extends `com.lld.config.DomainException`.
- Each CONCRETE exception carries `@ResponseStatus(HttpStatus.X)`. Conventions:
  400 invalid input/rejected transition · 401/403 auth · 404 unknown id ·
  409 conflict/quota/uniqueness · 410 expired hold · 422 understood-but-unexecutable.
- `GlobalExceptionHandler` returns `com.lld.config.ErrorResponse` `{ error, code, status, timestamp }`.
- NEVER `Map.of("error", e.getMessage())`. Use `ErrorResponse.of(e)` / `ErrorResponse.messageOf(e)`.
- Domain exceptions never map to 5xx — `DomainExceptionContractTest` enforces it. If your
  module's base exception name collides with an existing one (e.g. a second
  `PaymentFailedException`), give beans/classes explicit names and add the base to the
  contract test's BASES allowlist only if it declares no status of its own.

## Design data — one file per module

- `frontend/src/data/design/<module>.js`   — requirements, entities, designPatterns,
  principles, oopConcepts, extensibility, tradeoffs, title, tldr
- `frontend/src/data/diagrams/<module>.js` — title, classes[], relationships[];
  every relationship endpoint MUST match a declared class name (a test drops bad edges)
- Register each in the barrel: `frontend/src/data/designDetails.js` / `classDiagrams.js`.
- NEVER add a second key for the same module (RCA-002). Module-id lookup goes through
  `frontend/src/data/moduleKeys.js` — add spellings to its ALIAS_MAP, never to components.
- Sequence diagrams: `frontend/src/data/sequences/<module>.js` (see splitwise.js for shape:
  flows[{ participants[{id,name,kind,stereotype}], steps[{from,to,text,type,detail}] }]),
  registered in `frontend/src/data/sequenceDiagrams.js`, rendered by
  `components/SequenceDiagram.jsx` as a page tab (see SplitwisePage's 'sequence' tab).

## Reference modules — copy these, they set the bar

- Backend depth:  `com/lld/splitwise/`, `com/lld/logging/`, `com/lld/uber/`
- Sim engine shape: any recent module's `sim*` methods on the service +
  `/sim/*` controller endpoints over isolated repositories (stackoverflow, carrental)
- Seat/hold concurrency: `com/lld/movieticket/`, `com/lld/concertticket/`
- Canonical pair locking: `com/lld/linkedin/` (`min(u1,u2) + "#" + max(u1,u2)`)
- Primitive trace engine: `com/lld/concurrency/` (BlockingQueue primitive + TraceRecorder)

## Hard rules

- NEVER start the backend or frontend yourself. The user runs servers manually.
  You may run `mvn test`, `mvn package`, `npx vitest run` and `npm run build`.
- Both suites must stay green and GROW: never delete or weaken an existing test.
- `designDataCoverage.test.js` holds a `PENDING_DESIGN_CONTENT` allowlist (currently the
  eight primitives minus blocking-queue). When you add design content for a listed module,
  REMOVE it from the list — a test keeps the list honest.
- Conventional commits, one commit per concern/module: `feat(inventory): ...`,
  `test(chess): ...`.
- GIT WORKFLOW: branch off main → commit → push → `gh pr create --base main --fill` →
  CI green ("Backend — mvn test" + "Frontend — vitest + build") → merge → delete branch.
  Never commit to main directly.
- Report honestly with a per-module checklist against the 17 criteria, naming what you skipped.
```

---

## Prompt W1 — Wave 1: six pattern-gap domain modules (one commit per module)

```text
Task: raise inventory, digitalwallet, trafficsignal, taskmanagement, auction and socialnetwork
to the 17-criteria bar. Each already has a small working backend and UI — deepen, don't restart.
Each README claim that the code doesn't honour is the module's headline fix.

1. inventory — Observer (low-stock crossings notify in-app + logging observers) + Strategy
   (reorder policy). Concurrency test: simultaneous decrements never drop stock below zero.
2. digitalwallet — Command pattern (credit/debit/transfer with execution log) + deadlock-free
   two-account transfer locking via ascending account-id order. Concurrency test: concurrent
   transfers between two wallets conserve total balance exactly.
3. trafficsignal — State pattern for signal phases with timed transitions + Observer for phase
   broadcasts + emergency override. Injectable clock/scheduler so tests don't sleep.
4. taskmanagement — State machine with a declared transition table rejecting illegal moves +
   Strategy for priority ordering.
5. auction — per-auction ReentrantLock serialising bids (re-check current bid inside the lock),
   Observer for outbid notifications, Strategy for bid validation/auto-increment, lifecycle
   guards. Concurrency test: N simultaneous equal bids — exactly one wins, rest rejected.
6. socialnetwork — SPECIAL CASE: backend exists at /api/social but the UI mocks everything.
   FIRST write api.js against real endpoints and rewire the page; then bring the backend to the
   bar: Observer feed fan-out, canonical pair locking for friend requests (linkedin idiom),
   typed exceptions, /sim/*, Lombok, concurrency tests.

Every module: typed exceptions on the DomainException contract, isolated /sim/* engine with
event log + snapshots, Lombok models, four test flavours (service/unit/repository/concurrency),
8-step simulation tab wired to /sim/*, design + diagram data refreshed, sequence diagram file,
AGENTS.md + README.md updates.
```

---

## Prompt W2 — Wave 2: games (chess first)

```text
Task: raise chess, minesweeper, snakeladders, ludo to the bar, plus a tictactoe top-up.

CHESS FIRST — treat it as primarily a testing job. Write tests BEFORE refactoring to pin
current behaviour and surface real bugs: per-piece legal moves, blocked paths, captures, pawn
promotion + two-square opening, castling (incl. cannot castle through/out of check), en
passant, check, checkmate, stalemate, rejection of moves leaving own king in check. Use FEN-style
or explicit boards. EXPECT BUGS — fix them and add RCA entries for non-trivial ones.
Then: strategy/ move generation per piece, command/ move+undo, typed exceptions, /sim/*, Lombok.

minesweeper: flood-fill reveal tests (empty region, grid edges, win, loss), decide-and-document
first-click-never-a-mine, seeded deterministic board generator, typed exceptions, /sim/*.
snakeladders: seeded/injectable dice, exact-win rule, snake/ladder chains, multiplayer turn
order, typed exceptions, /sim/*.
ludo: state/ for turn + token lifecycle, seeded dice, captures, safe squares, roll-six-to-leave-
home, exact-count home entry, typed exceptions, /sim/*.
tictactoe top-up: keep its passing tests; add /sim/* driving the existing simulation tab, typed
exceptions on the contract, Lombok where missing, extend AI tests (UNBEATABLE never loses from
empty board and from a mid-game fork).

Every module: four test flavours where meaningful (games may merge repository into service tests
— say so explicitly rather than skipping silently), 8-step simulation tab wired to /sim/*,
design + diagram data refreshed, sequence diagram file, docs updates.
```

---

## Prompt W3 — Wave 3: eight concurrency primitives with real thread traces

```text
Task: implement the remaining primitives in com.lld.concurrency as real Java that runs threads
and records a timestamped trace; rewrite the eight React scenes to replay the REAL trace.
blocking-queue is done — copy its shape exactly (controller/service/primitive/TraceRecorder).

Structure: one primitive class per problem under com/lld/concurrency/primitive/, dispatched by
ConcurrencyRunService, exposed at POST /api/concurrency/{name}/run returning
{ result, events[], threadCount, elapsedNanos }. Events: seq, nanos-since-start, thread name,
action, relevant state (permits, queue depth, bit index, partition bounds...).

Primitives + correctness assertions:
- foo-bar: two semaphores, strict "foobar" x n.
- zero-even-odd: exact 010203... interleave across three threads.
- fizz-buzz: four threads, canonical output 1..n, no dups/gaps.
- h2o: every 3 consecutive outputs = 2 H + 1 O.
- ttl-cache: ScheduledExecutorService eviction; gone after TTL, present before; no leaked tasks.
- striped-hashmap (concurrent-hashmap page): lock striping; N threads x M puts = N*M entries;
  different stripes proceed genuinely concurrently.
- bloom-filter: thread-safe bitset, k hashes; zero false negatives; FP rate within tolerance.
- merge-sort: ForkJoinPool RecursiveTask + sequential cutoff; matches Arrays.sort on randomised
  input incl. duplicates and pre-sorted.

Tests: one class per primitive, DETERMINISTIC — assert invariants (ordering, conservation, no
loss/duplication), prefer latches/barriers over sleeps, repeat races. Flaky here is worse than
none. Frontend: api.js per page calling /run and replaying events[] in the EXISTING scene with a
step scrubber + thread-lane timeline; keep visuals, swap data source. Write design + diagram
data AGAINST THE REAL CODE and remove all eight from PENDING_DESIGN_CONTENT. One AGENTS.md
section for com.lld.concurrency, README rows updated, RCA for any genuine race found.
```

---

## Prompt W4 — Wave 4: thin upgrades (elevator, lru-cache)

```text
Task: close the remaining criteria gaps on elevator and lru-cache without regressing anything.
elevator: audit against the 17 criteria — add whatever is missing (likely: full exception
hierarchy on the contract, repository test flavour, concurrency test for simultaneous floor
calls on one shaft, design-data refresh).
lru-cache: same audit path — likely missing typed exceptions, concurrency test hammering get/put
across threads asserting capacity never exceeds bound and hot keys survive, richer design data.
Both: refresh diagrams, add sequence diagrams, update docs.
```

---

## Prompt W5 — Wave 5: sequence-diagram coverage sweep

```text
Task: add frontend/src/data/sequences/<module>.js for every module that still lacks one,
registered in sequenceDiagrams.js and surfaced as a tab (copy SplitwisePage's integration).
Ground each flow in the REAL classes/methods/tests (cite the test that proves the step, like
splitwise.js does). Prioritise the modules upgraded in Waves 1–4, then the solid tier
(parkinglot, movieticket, atm, coffeemachine, vendingmachine, stockbroker, linkedin, airline,
library, shoppingcart, pubsub, elevator, hotel, concert-ticket, car-rental, course-registration,
cricinfo, music-streaming, stackoverflow, restaurant). Extend routing/designDataCoverage guards
if a test asserts sequence coverage honesty. Docs: note the convention in AGENTS.md.
```

---

## Verifying work that comes back

| Check | Command | Expect |
|---|---|---|
| Backend suite | `cd backend && mvn test` | Grows; 0 failures |
| Frontend suite | `cd frontend && npx vitest run` | Grows; 0 failures |
| Bundle budget | `cd frontend && npm run build` | Entry chunk under 500 kB |
| Sim surface | `grep -rc '"/sim/' backend/src/main/java/com/lld/<module>` | Non-zero for any claimed-done module |
| Tests present | `ls backend/src/test/java/com/lld/<module>` | ≥4 flavours for non-game modules |
| Sequence data | `ls frontend/src/data/sequences/` | Includes every wave module |

The single most useful question to ask back: **"show me the per-module checklist against the
17 criteria, and name what you skipped."**
