# Remaining Modules — Build Plan

Portfolio is at 54 modules (as of PRs #83–#85: Feature Flag, Notification System, Job
Scheduler; Locker Management and Payment Gateway shipped since — see RCA-058 and RCA-059
for real bugs caught during their builds). This document plans the remaining 7 modules
from the original gap-analysis session, in priority order. Each section is meant to be
handed to a fresh agent as a self-contained brief — read `new-lld` skill and one reference
module (`splitwise`, `logging`, or `uber`) first regardless.

## Read first

- `.claude/skills/new-lld/SKILL.md` — the end-to-end checklist (backend layout, exception
  hierarchy, `/sim/*` engine, frontend, tests, docs). Follow it exactly; don't reinvent the
  package layout.
- `.claude/skills/lld-tests/SKILL.md` — especially the **repeated-round concurrency test**
  requirement. A single-shot 2-thread race reliably passes on broken code; every race test
  in this repo runs 100–300 rounds with a fresh service instance per round.
- One existing module close to what you're building, read start to finish:
  `backend/src/main/java/com/lld/uber/` (state machine + strategy + `/sim/*`) or
  `backend/src/main/java/com/lld/notification/` (idempotency lock + priority queue).

## Hard-won gotchas from the last batch (Feature Flag / Notification / Job Scheduler)

These cost real time last round — check for them before considering a module done:

1. **A `@Component`/`@Service` with two constructors and no true no-arg constructor needs
   exactly one marked `@Autowired`.** Spring cannot guess between "the production
   constructor" and "the test/sim constructor," and fails with a *misleading* error —
   `NoSuchMethodException: <init>()` / "No default constructor found" — even though a
   constructor obviously exists. This silently fails every `@SpringBootTest` in the module.
   Symptom: `ApplicationContext failure threshold (1) exceeded` repeated across unrelated
   test methods. See RCA-054.
2. **A check-then-act lock that dedupes *which record* two racing callers agree on is not
   the same guarantee as deduping *which caller gets to act on it afterward*.** If a method
   both claims (idempotency lock) and acts (enqueues/dispatches) in one call, gate the "act"
   step on an explicit "did I just create this" flag — not on the record's mutable status,
   which a duplicate-resolution path shares with the original. See RCA-053.
3. **`mvn test -Dtest='com.lld.<key>.*'` does not match test classes directly in package
   `com.lld.<key>`** (only sub-packages) — use `com.lld.<key>.**` (double-star) instead, or
   surefire reports "No tests matching pattern" and looks like everything passed.
4. **`config/DomainExceptionContractTest.java` has a hardcoded `BASES` allowlist** of every
   module's base exception class name. Add yours (alphabetically) or the build fails with
   "these would return HTTP 500 with no message."
5. **`frontend/node_modules` won't exist in a fresh worktree** and installing it fresh is
   slow; if working in a worktree alongside the main checkout, symlink it instead:
   `ln -s <main-repo>/frontend/node_modules <worktree>/frontend/node_modules` (it's
   gitignored — a symlinked `node_modules` doesn't match git's `**/node_modules/` glob
   exactly since it isn't a real directory, so double-check `git status` never picks it up
   before committing).
6. **Shared files will conflict if modules are built in parallel**: `AGENTS.md`,
   `README.md` (both the table row *and* the numbered detail section — renumber whichever
   merges second), `frontend/src/App.jsx`, `frontend/src/pages/Home.jsx`,
   `frontend/src/data/classDiagrams.js`, `frontend/src/data/designDetails.js`,
   `frontend/src/__tests__/routing.test.js` (the `cards.length` count), and
   `backend/.../config/DomainExceptionContractTest.java`. This is expected — rebase onto
   `main` before opening/merging each PR, resolve additively, and bump the README's `###
   NN.` numbering and the routing test's card count to match how many modules are *actually*
   on `main` at merge time, not how many were on it when you branched.
7. **Run the *full* backend suite before opening a PR, not just the new package** — the
   shared `DomainExceptionContractTest` and `designDataCoverage.test.js` fail on things
   *outside* your new files (a missing barrel registration, a missing `BASES` entry).

## Build order

Same three tiers as originally scoped. Nothing in Tier 2/3 depends on another module in
this list, so they can be built in parallel worktrees — just expect the shared-file
conflicts above at merge time.

---

## Tier 2

### 1. Web Crawler

**Key**: `webcrawler` · route `/webcrawler` · package `com.lld.webcrawler`

**Pitch**: A multi-threaded crawler: a URL frontier queue, a worker pool that fetches
concurrently, a dedup set so no URL is ever fetched twice, and per-domain politeness
(a domain may not be hit again within N ms of its last fetch).

- **Domain**: `CrawlJob` (seed URLs, status), `Page` (URL, simulated fetched content/links,
  fetchedAt), `Frontier` (a queue of URLs to visit), a fake `PageFetcher` (returns
  deterministic simulated HTML/links rather than a real HTTP call — this module is about the
  crawl machinery, not real networking).
- **Patterns**: **Producer-Consumer** (frontier queue + a fixed worker pool — same shape as
  `blocking-queue`/`thread-pool` primitives but at the application-domain level), Strategy
  for politeness/URL-filtering policy (`respectRobotsTxt` on/off, domain allowlist), Observer
  for crawl-progress listeners (optional — only if it doesn't feel bolted-on).
- **The concurrency bug**: naive "if not in visited-set, add and fetch" is a check-then-act
  race — two workers can both check before either adds, and both fetch the same URL. Fix
  with `ConcurrentHashMap<String,Boolean>.putIfAbsent` (atomic claim) rather than
  `containsKey` + `put`. Separately, **per-domain politeness must itself be race-free**: a
  per-domain `ReentrantLock` (or a `lastFetchTime` map checked-and-updated atomically) so two
  workers assigned URLs from the same domain don't both fetch within the politeness window.
  Repeated-round test: N workers racing on a frontier seeded with duplicate URLs across
  domains; assert each unique URL is fetched exactly once and no domain is ever fetched
  twice within the politeness window.
- **API**: `POST /api/webcrawler/jobs` (seed URLs, maxPages) → starts a crawl,
  `GET /api/webcrawler/jobs/{id}`, `GET /api/webcrawler/jobs/{id}/pages`, `/sim/*`: reset,
  seed the frontier, dispatch workers (watch pages get claimed), hit a politeness delay,
  a live dedup-race demo, final snapshot with the visited set.
- **Exceptions**: `WebCrawlerException`, `CrawlJobNotFoundException` (404),
  `InvalidSeedUrlException` (400).

### 2. Generic Cache Library

**Key**: `cachelibrary` · route `/cachelibrary` · package `com.lld.cachelibrary`

**Pitch**: Not another single-policy cache demo (this repo already has `lru-cache` and
`ttl-cache`) — this is the **library design** itself: one `Cache<K,V>` interface, a
`CacheBuilder` that composes any eviction policy with optional TTL and optional stats, so a
caller writes `CacheBuilder.newBuilder().maximumSize(100).evictionPolicy(LFU).withStats()
.build()`. **Explicitly differentiate this from `lru-cache`/`ttl-cache` in the design
write-up** — those are demos of one algorithm each; this is a demo of pluggable
architecture.

- **Domain**: `Cache<K,V>` interface, `EvictionPolicy<K>` (LRU/LFU/FIFO — reuse the
  algorithmic ideas from `lru-cache`, don't copy the code), `CacheBuilder` (fluent
  configuration), a `StatsDecorator` wrapping any `Cache` to count hit/miss/eviction without
  the base implementation knowing about stats at all.
- **Patterns**: **Builder** (`CacheBuilder`), **Strategy** (`EvictionPolicy`), **Decorator**
  (`StatsDecorator` — genuinely wraps and delegates, doesn't just add a counter field
  internally), Factory (policy resolution from a config enum).
- **The concurrency bug**: a segment/shard-locked cache (mirroring how real
  `ConcurrentHashMap`/Guava Cache achieve throughput) — if you build it as one big lock
  around the whole map, say so explicitly as a documented trade-off rather than silently
  under-designing; if you build sharded locks, the race to prove is that concurrent
  `put`/`get`/eviction on *different* shards never blocks on each other while same-key
  operations still serialize correctly (same lesson as `concurrenthashmap` primitive, reused
  at a library-design level).
- **API**: this one is more library-shaped than request/response-shaped — expose it through
  a demo service: `POST /api/cachelibrary/configure` (policy, maxSize, ttlSeconds),
  `PUT /api/cachelibrary/{key}`, `GET /api/cachelibrary/{key}`, `GET
  /api/cachelibrary/stats`, `/sim/*`: reset, fill past capacity (watch eviction happen live),
  a TTL expiry demo, a stats-decorator readout, a concurrent-shard race demo.
- **Exceptions**: `CacheLibraryException`, `KeyNotFoundException` (404),
  `InvalidCacheConfigException` (400, e.g. maxSize ≤ 0).

### 3. Key-Value Store

**Key**: `kvstore` · route `/kvstore` · package `com.lld.kvstore`

**Pitch**: A toy Redis-shaped KV store: `SET`/`GET`/`DELETE`, optimistic-concurrency
`CAS` (compare-and-swap), TTL expiry, and a write-ahead log (WAL) that's replayed on
`/sim/reset` to demonstrate durability — differentiate from Generic Cache Library by
leaning into **versioning and CAS semantics**, not eviction.

- **Domain**: `KvEntry` (value, version, expiresAt), `WriteAheadLog` (an append-only list of
  `Command` objects — SET/DELETE — that can be replayed), the store itself.
- **Patterns**: **Command** (WAL entries are Commands with an `apply(store)` method — reused
  intentionally from the Command idea in Text Editor's design, but applied to durability
  instead of undo/redo, which is worth calling out explicitly as the same pattern serving two
  different purposes), Template Method (a common get/set/delete flow with hooks for
  TTL-expiry checking and WAL-appending), Strategy (eviction-on-full policy, reusing Generic
  Cache Library's `EvictionPolicy` interface if that module ships first — otherwise a
  simple standalone one).
- **The concurrency bug — this module's centerpiece**: `CAS(key, expectedVersion, newValue)`
  must be a genuine compare-and-swap, not a `get()` followed by an unconditional `set()`.
  Prove it with N threads racing `CAS` against the same key with a stale expected version —
  exactly one may succeed per version bump, the rest must retry-and-fail cleanly (return a
  `false`/`VersionConflictException`, not silently overwrite). This is the classic
  optimistic-concurrency-control demo and a genuinely different concurrency shape from every
  per-key-`ReentrantLock` module shipped so far — worth it specifically because it's
  *lock-free* (an `AtomicReference`/`compareAndSet` loop, or a versioned
  `ConcurrentHashMap.compute`), not another mutex.
- **API**: `PUT /api/kvstore/{key}` (SET), `GET /api/kvstore/{key}`,
  `DELETE /api/kvstore/{key}`, `POST /api/kvstore/{key}/cas` (expectedVersion, newValue),
  `/sim/*`: reset (replay WAL), a clean set/get, a TTL expiry demo, a live CAS race (many
  threads, one winner per round, watch the version counter), final snapshot with the WAL.
- **Exceptions**: `KvStoreException`, `KeyNotFoundException` (404),
  `VersionConflictException` (409 — this is the interesting one, not a 400: the request was
  well-formed, it just lost a race).

---

## Tier 3

### 4. Coupon/Promotion Engine

**Key**: `coupon` · route `/coupon` · package `com.lld.coupon`

**Pitch**: Apply one or more coupons to a cart total — percentage-off, flat-off, and BOGO —
with stacking/precedence rules and a hard per-coupon redemption limit.

- **Domain**: `Coupon` (code, discount type, conditions, maxRedemptions, currentRedemptions),
  `DiscountStrategy` (`PercentageOffStrategy`/`FlatOffStrategy`/`BogoStrategy`), a condition
  tree for eligibility (min cart value, category restriction, first-order-only).
- **Patterns**: **Strategy** (discount calculation), and for the eligibility conditions,
  prefer **Chain of Responsibility** over another Composite tree — Feature Flag already
  shipped a Composite `Condition` tree; a differently-shaped pattern here keeps the
  portfolio varied. Each condition handler either passes the cart through or rejects with a
  specific reason string.
- **The concurrency bug**: a coupon with `maxRedemptions = 100` must never be redeemed 101
  times under concurrent checkout — the classic bounded-counter check-then-act race, same
  lesson as Job Scheduler's cancel/dispatch and Feature Flag's rule swap but applied to a
  numeric budget instead of a status/tree swap. Fix with a per-coupon `ReentrantLock`
  guarding "read count, compare to limit, increment" as one atomic block (an
  `AtomicInteger.updateAndGet` with a bounded-increment function is the lock-free
  alternative — pick one and justify it in the design write-up).
- **API**: `POST /api/coupon` (create), `POST /api/coupon/{code}/apply` (cartTotal, category,
  isFirstOrder) → returns discounted total + which coupon logic fired, `/sim/*`: reset,
  a successful apply, a rejected apply (condition fails — show the reason), a live
  redemption-limit race (N concurrent applies against a coupon with 3 redemptions left —
  exactly 3 succeed), final snapshot.
- **Exceptions**: `CouponException`, `CouponNotFoundException` (404),
  `CouponExpiredException` (400), `RedemptionLimitExceededException` (409),
  `IneligibleCartException` (400 — a condition rejected the cart).

### 5. Blackjack / Deck of Cards

**Key**: `blackjack` · route `/blackjack` · package `com.lld.blackjack`

**Pitch**: The generic "design a deck of cards" interview question, given concrete shape as
Blackjack so it has a real game loop rather than being an abstract card-shuffling exercise.

- **Domain**: `Card` (rank, suit), `Deck`/`Shoe` (one or more decks shuffled together —
  real casinos deal from a multi-deck shoe, which is what makes the concurrency angle below
  possible), `Hand` (cards, computed value handling soft/hard aces), `Round` (bet, player
  hand(s), dealer hand, outcome).
- **Patterns**: **Factory** (`Deck.of(count)` builds and shuffles N standard decks into one
  shoe), **Strategy** (dealer-play rules: `HitOnSoft17Strategy` vs `StandOnSoft17Strategy` —
  genuinely different house rules, not cosmetic), **State machine**
  (`BETTING → DEALING → PLAYER_TURN → DEALER_TURN → SETTLEMENT`).
- **The concurrency bug**: model multiple simultaneous tables **sharing one physical shoe**
  (mirrors how real casinos run several tables off one continuous shuffle) — two tables'
  dealers must never draw the same physical card. The shoe's "draw next card" must be a
  single atomic pop guarded by one lock (or an `AtomicInteger` cursor into a pre-shuffled
  immutable array — a genuinely lock-free alternative worth using here, since the array is
  fixed-size and known upfront, unlike the CAS-retry-loop cases elsewhere in this plan).
  Repeated-round test: N tables racing to draw from a shoe of known size; assert every card
  position is dealt to exactly one table and the shoe never over-draws.
- **API**: `POST /api/blackjack/tables` (creates a table against the shared shoe),
  `POST /api/blackjack/{tableId}/deal`, `POST /api/blackjack/{tableId}/hit`,
  `POST /api/blackjack/{tableId}/stand`, `/sim/*`: reset (fresh shoe), deal a round, hit
  (bust or not), dealer plays out by strategy, settlement, a live multi-table shared-shoe
  race demo, final snapshot.
- **Exceptions**: `BlackjackException`, `TableNotFoundException` (404),
  `InvalidActionException` (400 — e.g. hitting after standing), `ShoeExhaustedException`
  (409 — the shared shoe ran out mid-deal, a genuine edge case worth modeling rather than
  hand-waving).

### 6. Workflow/Approval Engine

**Key**: `workflow` · route `/workflow` · package `com.lld.workflow`

**Pitch**: A generic multi-step approval chain — e.g. an expense report routes through
Manager → Director → Finance, with amount-based auto-escalation and a single point where
"approve" and "an automatic timeout escalation" can race.

- **Domain**: `WorkflowInstance` (current step, status, history), `ApprovalStep` (approver
  role, decision), an ordered chain of steps resolved by amount thresholds (a $50 expense
  only needs Manager; a $5,000 one needs all three).
- **Patterns**: **Chain of Responsibility** (the approval chain itself — each handler either
  decides or passes to the next), **State machine**
  (`PENDING → IN_REVIEW → APPROVED/REJECTED/ESCALATED`), Strategy (escalation/timeout
  policy — mirrors Job Scheduler's `MisfirePolicy` shape: what happens when a step isn't
  acted on in time).
- **The concurrency bug**: a human approval and an automatic timeout-escalation racing on
  the same workflow step at the same instant — both must serialize on a per-workflow-instance
  lock, and whichever "wins" must leave the instance in a single, well-defined state (never
  both approved *and* escalated). This is structurally the same shape as Job Scheduler's
  cancel/dispatch race (RCA-052-style: per-entity lock, re-check state inside the lock,
  100–300 round repeated test) — a deliberate callback to that pattern, worth stating
  explicitly in the design write-up as "the same guarantee as `jobscheduler`'s cancel/dispatch
  race, applied to approve/escalate."
- **API**: `POST /api/workflow` (submit, amount) → resolves the required chain,
  `POST /api/workflow/{id}/approve` (step, approverId), `POST /api/workflow/{id}/reject`,
  `GET /api/workflow/{id}`, `/sim/*`: reset, submit a small workflow (single step), submit a
  large one (full chain), approve through each step, a live approve-vs-escalate race, final
  snapshot with full history.
- **Exceptions**: `WorkflowException`, `WorkflowNotFoundException` (404),
  `InvalidStepTransitionException` (400), `UnauthorizedApproverException` (403 — wrong role
  acting on a step).

---

## After each module ships

Per the `new-lld` skill: register the route (`App.jsx` + `Home.jsx`), the design/diagram
barrels, bump `routing.test.js`'s card count, add the `AGENTS.md` section, the `README.md`
row + detail section, and — if a real bug surfaces while building and testing it (there
almost always is one, per the gotchas above) — an `RCA.md` entry via the `rca` skill. Then
`ship`: full local suites green, branch, PR, merge only on green CI.
