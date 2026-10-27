# LLD UI/UX completion handoff

Verified starting point: 2026-10-05, feature baseline `c588cd4` (PR #150).
This is the current UI/UX completion brief. `ROADMAP.md` records an older, completed
module-construction plan; its zero remaining modules does not mean the UI work is complete.

## Verified progress


- Learning catalog redesign: compact Start/Continue, separate available/roadmap
  views, outcome search, section/review/bookmark filters, sorting, card bookmarks
  and URL/back-navigation continuity. The catalog remains independent of backend
  availability and lesson chunks remain lazy. Browser checks cover 76 scenario
  views, both themes, 320–1440px, keyboard entry/return, saved notes, all-reviewed,
  blocked storage and 200% CSS zoom. Catalog actions preserve newer stored notes
  and unsaved drafts (RCA-122). See `LEARN_PAGE_UX_PLAN.md` for evidence and limits.
  Current validation: 2622 backend and 801 frontend tests pass, plus package,
  lint (14 existing warnings), build and chunk budgets.
  CI and deployed review are pending; full curriculum/module completion remains
  separately tracked.

- ATM request-validation batch: 2622 backend cases and 778 frontend cases pass;
  Maven package, lint (14 existing warnings), Vite build and chunk budgets pass.
  Browser verification covers 56 views and 248 actual Java MockMvc requests in
  eight theme/viewport contexts. A lifecycle-test failure found during the full
  run was corrected by awaiting captured thread termination while retaining
  reset-blocking assertions; the complete backend rerun passes (RCA-119).

- ATM live-workspace improvements retain confirmed session state across tabs,
  guard mutations, invalidate stale reads and offer explicit recovery, labeled
  forms and responsive layout (RCA-115). Agent validation passed 43 focused cases
  and eight browser contexts using contract-shaped fixtures. This is a scoped
  frontend improvement, not a complete ATM module sign-off. Request/amount validation
  now rejects malformed fields, nonpositive/non-finite deposits, overflow and truncated
  withdrawals before mutation (RCA-116); 77 new Java/HTTP regressions cover that scope.
  Session/snapshot lifecycle review, backend session/idempotency support and hosted
  integration remain follow-ups.

- Analytics is installed in the React/Vite root via `@vercel/analytics/react`;
  page URLs redact query strings/fragments. On 2026-10-27 the production tracking
  script returned plain-text 404 rather than JavaScript. Dashboard enablement and
  a deployment afterward are still required to verify actual visitor collection;
  no authenticated Vercel dashboard connection is available in this session.

- All 60 modules exist, with Java backends, routes, and design data.
- Homepage discovery, navigation memory, mobile tabs, and shared diagram zoom,
  fit-width, fullscreen, and keyboard controls have shipped.
- 18 modules use shared guided playback: car-rental, chess, circuit-breaker, elevator,
  kvstore, lru-cache, ludo, movieticket, parking, rate-limiter, snakeladders, splitwise, thread-pool,
  tictactoe, traffic-signal, uber, zomato, logging-framework.
- Nine modules use shared recorded playback: blocking-queue, bloom-filter,
  concurrent-hashmap, fizz-buzz, foo-bar, h2o, merge-sort, ttl-cache, zero-even-odd.
- Sandbox batch validation (#174): 2467 backend tests (291 suites) and 733 frontend tests (43 files).
  The sandbox lifecycle batch adds 14 Java cases and seven frontend cases, with
  real concurrent CAS workers, coordinator interruption/cleanup, detached event
  models/details, atomic reset responses and actual final-snapshot playback.
  KV request validation adds 58 HTTP/domain cases, checking strict types, null and
  empty values, both TTL overflow stages, unchanged state on rejection and real
  1/default-8/maximum-32-worker CAS experiments (RCA-110).
  The KV live workspace adds 16 cases for typed errors, guarded writes, lifecycle,
  uncertain outcomes, explicit CAS refresh, safe deletion and bounded responses.
  The state-boundary lesson batch adds 19 Java cases covering ten canonical files,
  constructor trace/rejections, access decisions and collection invariants. Seven
  added UI/content cases cover the lessons, durations and guided prerequisite order.
  Its final browser pass checks 320 lesson views across eight theme/viewport
  contexts, including all recorded steps, code/output, recovery and per-lesson
  persistence. Reading durations now come from the manifest, and the planned-topic
  hint appears only when there is no published next lesson.
  Four deployment-route cases additionally protect reserved Vercel/asset paths,
  normal lesson/module deep links and existing API/Swagger/metadata boundaries.
  The Enums/Interfaces batch adds 16 Java semantic/compiler cases and six UI/content
  cases, retaining the original object/reference lesson's verified behavior.
  Its final production-build browser run passed 184 views across both themes and
  320/390/768/1280px, including all three lessons, recovery, persistence and
  cross-lesson navigation. An explicit whitespace check failed before the CSS fix
  and passed afterward; mobile values now avoid splitting implementation names
  (RCA-107). Full frontend validation after the CSS change used one worker.
  The KV ordering batch adds 24 deterministic repository checks and two real-service
  MockMvc cases, plus 80 intercepted learning/diagram views across both themes and
  320/390/768/1280px. The default local frontend run hit one existing Bloom test's
  5s timeout on a loaded host; its focused file and the full suite passed with one
  worker and unchanged timeouts/assertions. CI remains a required merge gate.
  The coverage audit adds 56 production-built Home/ATM/KV view checks across both
  themes and 320/390/768/1280px. Its first run exposed a 16px shared pattern-grid
  overflow; the corrected grid passed all 56 checks. The reference slice's 96 browser
  checks were also repeated successfully, covering
  both themes and 320/390/768/1280px, including route/content failures, reload recovery,
  keyboard code scrolling, persistence, and links to actual system practice.
  Parking's preceding batch passed 72 views across the same theme/viewport matrix.
  These are scoped checks, not a completed whole-project audit.
- KV browser-review validation (#175): 2467 backend tests and 739 frontend tests;
  lint has zero errors and 14 existing warnings; Maven package and Vite build pass.
  Four shared-diagram cases and two expiry-display cases were added; existing async
  assertions now wait for final focus/reset outcomes without changing timeouts.
- Latest build: entry 312211 bytes; largest non-entry JavaScript chunk 57287 bytes.
- The curriculum catalog and Classes and Objects, Constructors, Access Modifiers,
  Enums, Interfaces, Encapsulation, Abstraction, Inheritance, Polymorphism and
  Association lessons are implemented; the remaining 59
  topics are visibly planned. Phase 2 remains open.
  See the curriculum workstream below.
- Phase 0 now has a complete 69-topic outcome/prerequisite/evidence/exercise/gap
  matrix and a cycle-checked canonical graph. This is an authoring audit, not 69
  delivered lessons. Unsupported module mappings remain explicit gaps.
- Rejected route imports/render failures now have focused reload/library recovery,
  rather than blanking the application. Suspense remains for pending imports.
- KV writes now append inside per-key compute; a lifecycle gate protects replay,
  reset and coherent detached map/log snapshots (RCA-106). Deterministic regressions
  cover the reproduced stale-replay bug. Sandbox event serialization and shared
  playback subsequently shipped in #174; the final whole-module KV review is separate.
- KV live Store/CAS now preserve confirmed records after failed reads, distinguish
  domain 404s from service/route failures, guard duplicate writes, cancel waiting on
  tab departure and ignore late results. Drafts survive built-in design tabs. CAS
  refresh and retry are explicit; DELETE has keyboard-safe confirmation. Unknown
  write outcomes require inspection and a user decision, without claiming rollback
  or that a read proves earlier work cannot finish (RCA-109). Sandbox operation/event
  serialization and simulation playback subsequently shipped in #174; final review
  remains separate from those implementation milestones.
- KV live/sandbox input validation now rejects malformed fields, blank keys,
  nonpositive versions/TTLs and overflow with typed 400 responses before mutation.
  Null/omitted TTL and empty string values work. CAS experiments reject counts
  outside 1–32 before seeding/logging/allocating workers; omitted count remains eight.
  Detached events and sandbox lifecycle serialization subsequently shipped in #174.
- KV sandbox state is now owned by a separate coordinator with a fair operation
  gate. Actual workers still race inside repository CAS, and reset waits for their
  termination. Responses detach events/details and preserve the completed race.
  Java reports retained/readable mappings and expired keys at a capture time; the
  browser never substitutes its own expiry clock. Seven shared guided steps include
  the final backend read, retained settings, cancellation and bounded/paged display
  (RCA-111). Its local browser review is complete: 288 views across both themes and
  four widths use 168 actual Java MockMvc requests, alongside 168 injected-failure
  live-workspace views and 64 chunk-failure/recovery views. Hosted network/backend
  deployment remains a separate release gate, not something these checks prove.
- Lint has 14 existing warnings and a suppression baseline; a successful lint exit
  is not evidence that every suppressed issue has been resolved.
- RCA-085's flaky scheduler-distribution assertion was resolved in #153 using
  deterministic legal-outcome coverage while retaining simultaneous-race safety checks.

## Remaining module review queue

These 33 modules have not yet adopted either shared playback implementation.
That is an inventory of migration candidates, not a finding that every module is broken
or needs identical controls. Audit each existing workflow and record the appropriate outcome.

airline, atm, auction, blackjack, cachelibrary, coffeemachine, concert-ticket, coupon,
course-registration, cricinfo, digitalwallet, featureflag, hotel, inventory, jobscheduler,
library, linkedin, locker, meeting-scheduler, minesweeper,
music-streaming, notification, payment, pubsub, restaurant, shoppingcart, social-network,
stackoverflow, stock-brokerage, task-management, vendingmachine, webcrawler, workflow.

## Completion matrix

Shared playback adoption (27/60) is tracked separately from local module UX sign-off
(1/60 closed: KV Store). Hosted integration/release verification remains separate.
A module is locally closed only when every column has evidence. "Static scan" means
the source was inventoried by script (timers, cleanup, live regions, busy guards) — it is
not a substitute for the per-module manual and browser review that is still required.

Cross-cutting findings from the 2026-10-05 static scan of the 35 non-adopted pages:

- **Flash-message timers (fixed, batch 1).** 14 pages cleared their status banner with an
  untracked `setTimeout`, so an older timer wiped a newer message early during rapid
  actions, and timers outlived the page. All 14 now use `hooks/useTransientMessage`, which
  cancels the previous timer, cancels on unmount, and keeps error messages until replaced.
- **No live regions (fixed, batch 2).** 77 conditional banners across 46 pages (including
  12 adopted modules) had no `role`; they are now `alert`/`status` regions, guarded by
  `accessibilityContracts.test.js` (RCA-088).
- **Status-token contrast (fixed, batch 2).** Light `--success/--danger/--warning/--info`
  and dark `--danger` failed 4.5:1 as text on their own tints. Light tokens are darkened in
  place and the dark danger tint alpha is lowered; the same test guards both.
- **Filled status contrast (fixed, batch 7).** Dedicated `--*-solid` fills and
  `--on-status-solid` now pair explicitly in 49 CSS/inline rules across the shared danger
  button and 18 modules. Existing text/tint colors are unchanged. The historical 69-site
  inventory also included text-free dots and bars, which retain their original colors.
  Tests cover both themes, enabled hover effects, and CSS/inline foreground pairing
  (RCA-094). Brand/accent surfaces and the full module-wide accessibility review remain open.
- **320px page overflow (fixed, batch 2).** coupon 16px (fixed two-column grid → `auto-fit`),
  airline 6px (non-wrapping passenger picker and seat legend), course-registration 69px (tables
  now in a local `overflow-x: auto` container). Airline's passenger `<select>` also had
  `outline: none` and an unassociated label; both are fixed. Only six routes were measured, so
  overflow on the other routes is still unverified.
- **Standalone page shells (fixed, batch 3).** airline, coffeemachine, library, linkedin, ludo,
  movieticket and vendingmachine hand-rolled their header, theme toggle, tabs and diagram/design
  wiring. They now render through `LldPage`, which provides tablist semantics, arrow keys,
  remembered tabs and the library breadcrumb. `accessibilityContracts.test.js` enforces this for
  every routed page (RCA-089).
- **Splitwise crash on load failure (fixed, batch 3).** `.catch(setError)` rendered an `Error`
  object (React #31) and blanked the page; its early-return errors now show a retryable alert.
- **Silent typed API failures (open, batch 4 inventory; Parking resolved in batch 8).** With every `/api` call answered by a typed 503,
  27 other routes remain to review: zomato, uber, stackoverflow, tic-tac-toe,
  snake-ladders, atm, splitwise (other tabs), elevator, movie-ticket, chess, ludo, inventory,
  shopping-cart, minesweeper, lru-cache, pub-sub, car-rental, auction, concert-ticket, locker,
  payment, webcrawler, cachelibrary, kvstore, coupon, blackjack, workflow. Some of these fetch
  only on demand, so each needs a per-page decision. A real network outage is already covered
  by the global `BackendStatusBanner`. Hardcoded banners in airline, library, linkedin, coffeemachine, and
  vendingmachine now use the tokens.
  KV's live Store/CAS are resolved in batch 15, and its simulation implementation in
  #174. Final browser review is being recorded separately; the original inventory
  is historical and should not be mistaken for 27 newly reproduced current failures.
- **Swallowed load errors.** digitalwallet (**fixed**, batch 2); logging-framework (**fixed**, batch 4, see
  below).
- **logging-framework live workspace (fixed, batch 4).** Live reads now expose retryable errors
  and preserve the last successful snapshot. Mutations have shared busy/error handling and
  synchronous duplicate-write guards; invalid MDC JSON blocks submission without losing input.
  Polling no longer scrolls the page, obsolete responses are ignored, and requests are aborted
  when the live workspace unmounts. Root thresholds use the selected value rather than the
  emitter severity; formatter and category overrides reflect confirmed backend configuration.
  Live controls have accessible names, responsive grids, and confirmation before clearing logs.
  The shared API client also accepts empty successful responses (RCA-091), so a successful
  clear/reset is not mislabeled as a JSON failure.
  Simulation controls shipped in batch 6; the final whole-module browser review remains pending.
- **Other uncleared animation timers (fixed, batch 1).** coffeemachine brew, vendingmachine
  slot spin and stackoverflow rejection flash now use the same hook.
- **Custom sim steppers (open).** Most remaining candidates have their own Next/step state with no
  shared pause/reset/progress semantics; each needs an adopt-or-justify decision.
- **Overlapping polls on tab return (fixed, batch 5).** The shared poll executor now
  guards all entry paths, including visibility notifications, while a request is in
  flight. Repeated return-to-view events cannot create duplicate reads or timer loops.
  Regression tests reproduce the former three-request overlap and verify hidden-tab
  pause, immediate idle refresh, error backoff, and unmount cancellation (RCA-092).
- **Logging simulation outcome mismatch (fixed, batch 6).** Threshold changes now reach
  the Java sandbox, which initializes and reports the same real DEBUG threshold. Shared
  guided steps display actual emission outcomes and sink snapshots, describe synchronous
  dispatch and the returned queue capacity, and support explicit start/pause/reset,
  cancellation, recovery, and bounded output. Reset/configure/emit/snapshot operations
  share one sandbox lock (RCA-093). The final whole-module audit remains pending.

| Module | Playback | Inspection | Concrete gaps | Chosen interaction | Implementation | Test evidence | Browser coverage | PR |
|---|---|---|---|---|---|---|---|---|
| airline | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2); standalone shell (**fixed**, batch 3) | Pending per-module review | Batches 1–2 fixes; batch 3 shell migration | `transientMessage.test.jsx`, `accessibilityContracts.test.js`, shell contract | Intercepted Chromium, 4 views (batch 3) | #152, #155, #156 |
| atm | Not adopted | Live frontend and request validation reviewed 2026-10-27; whole-module sign-off remains open | Session/snapshot lifecycle and simulation review remain; hosted integration is unverified | Retained confirmed live session/drafts/receipt; guarded requests and explicit recovery; strict Java amount/request validation | #177 live workspace; RCA-115/116; earlier teaching/grid fixes | 77 new real-service/HTTP boundary cases; existing ATM/concurrency/domain tests; 22 live workspace/API cases | 56 live views with 248 actual Java MockMvc browser requests across light/dark ×320/390/768/1280; prior 8 fixture contexts and 24 learning views; not hosted HTTP E2E | #155, #167, #177; request-validation branch |
| auction | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| blackjack | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| blocking-queue | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| bloom-filter | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| cachelibrary | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| car-rental | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| chess | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| circuit-breaker | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| coffeemachine | Not adopted | Static scan 2026-10-05 | brew-animation timer not cleared (**fixed**, batch 1); live regions (**fixed**, batch 2); standalone shell (**fixed**, batch 3) | Pending per-module review | Batches 1–2 fixes; batch 3 shell migration | `transientMessage.test.jsx`, `accessibilityContracts.test.js`, shell contract | Intercepted Chromium, 4 views (batch 3) | #152, #155, #156 |
| concert-ticket | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| concurrent-hashmap | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| coupon | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| course-registration | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| cricinfo | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| digitalwallet | Not adopted | Static scan 2026-10-05 | live regions + swallowed load errors (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| elevator | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| featureflag | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| fizz-buzz | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| foo-bar | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| h2o | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| hotel | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| inventory | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| jobscheduler | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| kvstore | Shared guided | Local UX review closed 2026-10-26; hosted integration remains a release gate | Reviewed live, simulation and learning flows pass; extreme expiry presentation, shared diagram readability/clipping/focus and async test synchronization fixed | Guarded live forms with confirmed snapshots; seven acknowledged simulation steps with configuration, pause/reset and real final read | Batches 10–11, 15–18; RCA-106/109–114 | `kvWorkspace.test.jsx` (18), `kvSimulation.test.jsx` (7), request validation (58), lifecycle (14), real-service controller/replay/concurrency, diagram and curriculum contracts | 288 views/168 real Java MockMvc requests; 168 injected-failure live views; 64 lazy-failure/recovery views; 8 diagram probe contexts, light/dark ×320/390/768/1280; not hosted HTTP E2E | #152, #155, #167, #168, #172, #173, #174; `fix/kv-browser-review` |
| library | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2); standalone shell (**fixed**, batch 3) | Pending per-module review | Batches 1–2 fixes; batch 3 shell migration | `transientMessage.test.jsx`, `accessibilityContracts.test.js`, shell contract | Intercepted Chromium, 4 views (batch 3) | #152, #155, #156 |
| linkedin | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2); standalone shell (**fixed**, batch 3) | Pending per-module review | Batches 1–2 fixes; batch 3 shell migration | `transientMessage.test.jsx`, `accessibilityContracts.test.js`, shell contract | Intercepted Chromium, 4 views (batch 3) | #152, #155, #156 |
| locker | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| logging-framework | Shared guided | Live workspace and sandbox reviewed 2026-10-18 | Live defects fixed; sandbox threshold/outcome/telemetry/cleanup fixed; final whole-module audit pending | Live request/response console; eight guided backend operations/reads | Batches 4 and 6 | Workspace tests; sandbox service/concurrency/MockMvc, UI, API isolation and lifecycle tests; full suites 625 frontend / 2320 backend pass | Batch 4: 3 live tabs × 4 widths × 2 themes; batch 6: 8 contexts, 16 outcome checks plus recovery/keyboard/pending navigation/reduced motion, no overflow/errors | #160, #163 |
| lru-cache | Shared guided | Shipped #141–#147 | Final cross-project audit pending | `SimulationControls` | Adopted | Existing sim suites | Partial (prior batches) | #141–#147 |
| ludo | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending; standalone shell (**fixed**, batch 3) | `SimulationControls` | Adopted; batch 2 a11y fix; batch 3 shell migration | Existing sim suites, `accessibilityContracts.test.js`, shell contract | Intercepted Chromium, 4 views (batch 3) | #141–#147, #155, #156 |
| meeting-scheduler | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| merge-sort | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| minesweeper | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| movieticket | Shared guided | Shipped #141–#147 | standalone shell (**fixed**, batch 3); final cross-project audit pending | `SimulationControls` | Adopted; batch 3 shell migration | Existing sim suites, `accessibilityContracts.test.js` | Intercepted Chromium, 4 views (batch 3) | #141–#147, #156 |
| music-streaming | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| notification | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| parking | Shared guided | Live workspace, sandbox and learning tabs reviewed 2026-10-18 | Retry/duplicate/abort/payment ambiguity, server-time display, reset/snapshot isolation and learning contrast/focus fixed; formal final sign-off remains open | Live request/response forms; nine guided sandbox steps | Batch 8; shared learning accessibility fixes | 83 Parking backend tests including real-service MockMvc; 20 workspace tests; actual API wrappers; full 2329/664 suites pass | 72 intercepted production views, all 8 tabs + Home, 4 widths × both themes; keyboard, reduced motion, recovery, pending navigation and persisted return state | #165 |
| payment | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| pubsub | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| rate-limiter | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| restaurant | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| shoppingcart | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| snakeladders | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| social-network | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| splitwise | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending; load-failure crash + retry (**fixed**, batch 3) | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js`, `loadFailureStates.test.jsx` | Partial (prior batches) | #141–#147, #155, #156 |
| stackoverflow | Not adopted | Static scan 2026-10-05 | vote-reject flash timer not cleared (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| stock-brokerage | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| task-management | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
| thread-pool | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| tictactoe | Shared guided | Shipped #141–#147 | Final cross-project audit pending | `SimulationControls` | Adopted | Existing sim suites | Partial (prior batches) | #141–#147 |
| traffic-signal | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| ttl-cache | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| uber | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
| vendingmachine | Not adopted | Static scan 2026-10-05 | slot-spin timer not cleared (**fixed**, batch 1); live regions (**fixed**, batch 2); standalone shell (**fixed**, batch 3) | Pending per-module review | Batches 1–2 fixes; batch 3 shell migration | `transientMessage.test.jsx`, `accessibilityContracts.test.js`, shell contract | Intercepted Chromium, 4 views (batch 3) | #152, #155, #156 |
| webcrawler | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| workflow | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
| zero-even-odd | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| zomato | Shared guided | Shipped #141–#147 | Final cross-project audit pending | `SimulationControls` | Adopted | Existing sim suites | Partial (prior batches) | #141–#147 |

### Batch log

| Batch | Scope | PR | Validation |
|---|---|---|---|
| 1 | Matrix, `useTransientMessage` across 17 pages (RCA-086) | #152 | 579 vitest, lint 16 (baseline), build budgets, 2308 mvn; CI green |
| 1b | RCA-085 deterministic workflow outcomes (separate PR) | #153 | `WorkflowConcurrencyTest` 6/6 ×3, 2308 mvn; CI green |
| 2 | Live regions on 77 banners, AA status tokens, wallet load errors, 320px overflow (RCA-088) | #155 | 581 vitest (584 after merging #154), lint 16, budgets; intercepted Chromium 6 routes × 4 views; CI green |
| 3 | Seven standalone pages onto `LldPage`; Splitwise load-failure crash + retry (RCA-089) | #156 | 586 vitest (29 files), lint 16, entry 307,442 B; intercepted Chromium 8 routes × 4 views |
| 4 | Logging live workspace recovery/configuration/cleanup and shared empty-response handling (RCA-090/091) | #160 | 610 vitest, 2308 mvn, Maven package pass; lint 16 baseline warnings; build and both budgets pass (entry 310,318 B; largest non-entry 55,479 B); intercepted Chromium 24 tab/theme/viewport checks |
| 5 | Serialize visibility-triggered polls with pending requests (RCA-092) | #162 | Reproduced three overlapping calls before fix; 612 frontend and 2308 backend tests pass; lint 16 baseline warnings; Maven package, Vite build and both budgets pass (entry 310,318 B; largest non-entry 55,479 B); 24 intercepted browser tab/theme/viewport checks plus 8 controlled visibility checks pass |
| 6 | Logging sandbox configuration, real outcomes, atomic snapshots and guided playback (RCA-093) | #163 | 625 frontend and 2320 backend tests, Maven package, Vite build and both budgets pass (entry 310,324 B; largest non-entry 55,479 B); lint 14 existing warnings; 8 browser contexts / 16 outcome checks pass |
| 7 | Separate filled status surfaces from text/tint roles in shared controls and 18 modules (RCA-094) | #164 | 629 frontend and 2320 backend tests, Maven package, Vite build, both budgets pass (entry 310,324 B; largest non-entry 55,479 B); lint 14 existing warnings; 576 cascade probes plus 24 routed views / 56 control checks pass |
| 8 | Parking live recovery, cancellation/duplicate guards, Java elapsed time, sandbox snapshots/reset lock and learning contrast/focus (RCA-095–098) | #165 | 664 frontend / 2329 backend tests; Maven package, Vite build, budgets and CI pass; 14 existing lint warnings; 72 intercepted browser views across 8 contexts |
| 9 | Curriculum catalog and reference lesson; canonical Java examples, local lesson learning state, route/content recovery, cross-tab visit protection and portable output checks (RCA-099–102) | #166 | 684 frontend / 2334 backend tests; lint 14 existing warnings; Maven package and Vite build pass; entry 312,191 B / largest non-entry 56,068 B; 96 intercepted browser views across 8 contexts |
| 10 | Phase 0 evidence map and prerequisite DAG; ATM/KV teaching-contract corrections; shared pattern-grid mobile minimum (RCA-103–105) | #167 | 693 frontend / 2334 backend tests; lint 14 existing warnings; Maven package, Vite build and budgets pass (entry 312,173 B / largest non-entry 56,079 B); 56 targeted learning/filter views plus 96 reference-flow checks pass |
| 11 | KV per-key append ordering, replay/reset gate, detached responses and coherent map/log snapshots; corrected sequence/class/design views (RCA-106) | #168 | 2360 backend / 693 frontend tests; full frontend pass uses one worker after one loaded-host timeout; lint 14 existing warnings; Maven package, Vite build and budgets pass (entry 312,173 B / largest non-entry 56,079 B); 80 intercepted learning/diagram views across 8 contexts |
| 12 | Enums and Interfaces lessons, canonical Java/compiler cases, generic recorded fields, prerequisite/navigation links and faithful mobile input rendering (RCA-107) | #169 | 2376 backend / 699 frontend tests; lint 14 existing warnings; Maven package, Vite build and both budgets pass (entry 312,173 B / largest non-entry 56,079 B); 184 intercepted browser views across 8 contexts |
| 13 | Keep reserved Vercel endpoints and build assets outside the SPA HTML rewrite (RCA-108) | #170 | 2376 backend / 703 frontend tests, lint (14 existing warnings), Maven package, Vite build and budgets pass. Post-deployment: six real lesson views and two catalogs pass without runtime JS errors; analytics and missing-asset endpoints return 404/text/plain instead of HTML/200. Analytics collection still requires dashboard setup/verification. |
| 14 | Constructors, Access Modifiers and Encapsulation lessons; canonical Java/compiler/fixture checks, manifest durations, proposed labels and guided sequence | #171 | 2395 backend / 710 frontend tests; lint 14 existing warnings; Maven package, Vite build and both budgets pass (entry 312,173 B / largest non-entry 56,079 B); 320 intercepted browser views across 8 contexts. |
| 15 | KV live Store/CAS errors, request ownership, guarded mutations, uncertain outcomes, confirmation and mobile forms; remove three obsolete label suppressions (RCA-109) | #172 | 2395 backend / 726 frontend tests; Maven package and Vite build pass; lint 14 existing warnings; entry 312,211 B / largest non-entry 56,079 B; 168 intercepted browser views across 8 contexts. |
| 16 | KV strict request types, typed domain validation, checked TTL arithmetic and bounded CAS experiment sizes (RCA-110) | #173 | 58 new real HTTP/domain cases; 2453 backend / 726 frontend tests, package/build/budgets pass; lint 14 existing warnings. Simulation lifecycle/events/playback remained open until #174. |
| 17 | KV sandbox coordinator, worker termination, detached event/race snapshots, Java readability counts and seven-step shared playback (RCA-111) | #174 | 2467 backend / 733 frontend tests; Maven package, lint (14 existing warnings), Vite build and budgets pass. Full browser/module review was explicitly deferred at the user's shipping-and-stop request. |
| 18 | Complete local KV review; shared diagram contrast/toolbar/focus, acknowledged large-expiry display and async final-state assertions (RCA-112–114) | `fix/kv-browser-review` | 2467 backend / 739 frontend tests; package/lint/build/budgets pass (312,211 B entry / 57,287 B largest non-entry). 288 Java-backed browser views, 168 injected live cases, 64 lazy-recovery views and the shared diagram probe pass. KV locally closed; hosted integration remains open. |

Batch 4 browser checks used production-built assets and intercepted API fixtures at
320, 390, 768, and 1280px, in both themes with reduced motion. They exercised read
failure/retry, invalid MDC, failed/successful writes, empty HTTP 200 clear responses,
configuration changes, duplicate prevention, pending navigation, and keyboard focus.
This is browser interaction evidence, not live HTTP end-to-end verification. The
Vercel analytics script was stubbed in the harness; analytics reporting was not tested.

Batch 5 repeated the same browser matrix and held one configuration request pending
while sending repeated hidden/visible notifications. Each theme/viewport combination
retained exactly one request. These checks synthesize document visibility events;
they do not assert operating-system tab switching or live-backend behavior.

Batch 6 used production assets and intercepted API fixtures to exercise accepted
and filtered outcomes at 320/390/768/1280px in both themes, with reduced motion,
configuration failure/reset recovery, frozen settings, keyboard sink selection,
and navigation during a pending reset. No page errors or horizontal overflow were
observed. Java service and MockMvc tests independently cover the real threshold,
HTTP 204 filtering, isolation, startup/reset defaults, and concurrent snapshots.

Batch 7 separated the historical status-fill inventory into text-bearing controls
and text-free graphics. Chromium evaluated actual source CSS for 48 distinct controls
at 320/1280px in both themes, in normal/hover/focus states (576 checks, minimum
4.85:1). These are isolated cascade probes, not complete rendered module workflows.
Separately, production-built cricinfo, workflow, and traffic-signal routes used
intercepted API fixtures at 320/390/768/1280px in both themes (24 views, 56 control
checks). Keyboard ball recording, approval completion, retry, and responsive layout
checks passed without page errors or horizontal overflow. No application server
was started; other module flows and brand/accent contrast remain unverified.

Batch 8 used production assets and Java-generated fixtures (not live HTTP), including
typed failure injection, duplicate-write checks, stale-read recovery, a 30-ticket page
fixture, actual sandbox outcomes, abort on departure, and Home/progress/revisit/tab
memory. Backend service/concurrency/MockMvc suites separately cover real operations.

Batch 9 adds a self-contained frontend curriculum with one published reference lesson.
The browser matrix covers initial route-chunk and later lesson-content failures,
explicit reload recovery, catalog/search/bookmarks, object illustration selection,
keyboard code scrolling, prediction feedback, notes/review across navigation and
reload, actual Parking Lot and system-path links, and planned/unknown deep links.
It checks page overflow and filled-accent contrast; mobile light and desktop dark
screenshots were inspected. No application server was started. The Java example and
its output/snapshots are separately compiled and checked by five real Java tests.

Batch 15 browser evidence uses production assets and intercepted response/error
fixtures, including delayed requests, typed 503/domain 404/route 404/network failures,
captured-key retries, draft preservation across built-in tabs, duplicate submissions,
CAS conflicts/refresh, uncertain writes, keyboard confirmation, long values and ten
recent responses. Both themes and four widths pass page-overflow, enabled-control
contrast and 44px touch-height checks. Screenshot review additionally caught mobile
Delete label compression; labels now stay on one line and history follows the live
forms and confirmed record. Java MockMvc independently pins the real missing-key
code; these browser responses are intercepted, not live-backend E2E. The KV simulation
and backend request-validation audit remained open at that batch; adoption was
26/60 and module sign-off 0/60. Batches 16–18 subsequently address those KV gaps.
Post-merge read-only production inspection additionally
passed 16 Store/CAS views across the same eight contexts, including keyboard tab
navigation, without any KV API calls or runtime errors. Evidence is retained in
`/home/prem/validation/lld-kv-live/live-workspace*`.

Batch 16 subsequently resolves the request-validation gap with actual MockMvc and
direct-service/repository cases. JSON errors include error/code/status/timestamp;
malformed bodies retain the shared framework contract. Both millisecond conversion
and expiry timestamp addition reject overflow before publishing state or appending
commands. Valid null TTL, empty values, absolute expiry through CAS, and real
1/8/32-worker experiments are tested. Detached sandbox events and full operation
serialization remain open; this does not close the module or change playback counts.

Read-only production checks after #171 also passed all six published lessons in
both themes at 390px (12 lesson views and two catalogs), including every recorded
illustration's exact field values. No runtime errors or backend mutations occurred.
Evidence is retained under `/home/prem/validation/lld-kv-live/live*`; this verifies
deployed lesson delivery, not all curriculum or module behavior.

### Curriculum workstream

Phase 0 is complete in `LLD_CURRICULUM_COVERAGE.md`: every canonical topic has a
learning outcome, recommended prerequisites, source evidence or an explicit mapping
gap, a concrete exercise and missing-delivery criteria. Twenty-four inspected
evidence groups record runtime call paths and tests as well as reuse limits. The
manifest now contains the same cycle-checked topic-specific prerequisite graph.

The audit corrected ATM's unsupported Template Method/execute claim and KV's
unsupported lock-free, immutable-value and process-crash persistence descriptions.
These were teaching/documentation fixes, not a new backend concurrency algorithm.
The shared pattern grid also now fits a padded 320px page. Browser evidence covers
these learning views only; neither module is formally closed by this batch.

`LLD_LEARNING_CURRICULUM_PLAN.md` was merged in #159 with green CI. It specifies the
requested OOP, principles, patterns, UML, concurrency, and interview curriculum.
Phase 1's Classes and Objects reference slice is implemented in batch 9: `/learn`,
`/learn/classes-and-objects`, a shared content renderer, Java-verified source/visuals,
exercise/self-check, local notes/bookmarks/review/resume, and verified practice links.
The first Phase 2 batch adds Enums and Interfaces with canonical Java, verified
recorded illustrations, predictions, exercises/rubrics and actual Parking source
links. The shared renderer supports concept-specific fields and published
prerequisite links. `OopExamplesTest` also compiles negative examples and checks
both formatter implementations against one input contract.
The second Phase 2 batch (#171) adds Constructors, Access Modifiers and Encapsulation,
canonical Java/compiler/fixture checks, per-topic durations and a guided sequence
that visits published prerequisites first. Both new supplemental topics retain
their proposed-addition labels. Nine OOP/relationship concepts and the final
Phase 2 assessment/diagrams remain open.
The third batch adds Abstraction, Inheritance, Polymorphism and Association, with
78 additional Java semantic/compiler/fixture cases and per-lesson UI checks.
The guided sequence and isolated notes/bookmarks are covered by a cross-lesson
navigation test. Five OOP/relationship topics and the Phase 2 assessment remain open.
The canonical manifest inventories 69 topics; ten are published and 59 are planned.
Phases 2–7 and the two introductory guides remain open. This is separate from the existing-module UI/UX matrix; do not
infer overall completion from either one lesson or the historical 60-module roadmap.
The pattern inventory was checked on 2026-10-18: the original request named 22
patterns, and Interpreter is now an explicit proposed addition to complete the
23-pattern catalog (5 creational, 7 structural, 11 behavioral). Prerequisites are
guidance, not enrollment locks. Remaining lesson implementation and the final
60-module sign-off are pending. KV map/log ordering is now fixed with deterministic
append/lifecycle regressions (RCA-106), separate from the original teaching-copy
correction. Complete sandbox operation/event serialization and final KV UX review
remain open.

## Prompt to give the next agent

Copy the text below, or ask the agent to read this file and execute this section.

```text
Take this existing lld-with-ui project through completion of its UI/UX improvement
program. Implement, verify, and ship the work. The intended outcome is a coherent,
accessible learning experience across all 60 existing modules, using the sibling
hld-with-ui project and the dsa-with-ui homepage as design references. Preserve the
LLD project's identity and working behavior.

Start by reading AGENTS.md, CLAUDE.md, COMPLETION_HANDOFF.md, the current README,
and relevant recent RCA entries. Verify the current Git state and source; treat
documented counts as a baseline, not an immutable target. Inspect sibling projects
read-only and respect their instructions. Reuse relevant local Claude skills where
they fit; reconcile older skill assumptions with actual backend behavior and the
shared UI patterns already shipped.

Build a durable 60-module completion matrix in this handoff file. For every module,
record inspection status, concrete gaps, chosen simulation interaction, implementation
status, test evidence, browser coverage, and merged PR. Separate shared playback
adoption from local UX sign-off and hosted release verification. KV is locally
reviewed; the other 26 adopted modules still need final review. For each of the
33 remaining candidates, adopt the appropriate
shared controls or document why its existing interaction is better suited and meets
the same usability and lifecycle requirements. Do not redesign working pages merely
to satisfy an adoption count.

Prioritize concrete user problems and work in coherent batches:
1. Complete simulation UX: discoverable start/pause/reset/step controls where useful,
   meaningful configuration, visible progress and outcomes, actionable errors, bounded
   long lists/logs, and reliable request/timer cleanup when leaving a tab or route.
2. Make forms, tables, loading/error/empty/success states, validation, retry behavior,
   and destructive-action confirmation consistent. Reuse existing shared components.
   Preserve entered values after recoverable errors; prevent accidental duplicate
   mutations and clearly explain sandbox resets and ambiguous request failures.
3. Complete mobile and accessibility review across all routes and tabs: light/dark
   themes, keyboard navigation, labels, focus visibility/restoration, dialog behavior,
   reduced motion, readable contrast, and usable touch targets. Check at 320px, 390px,
   768px, and 1280px. Keep wide tables/diagrams in intentional local scroll containers
   and eliminate accidental page overflow. Verify homepage filters, return navigation,
   progress, and solution-reveal behavior as part of real learning flows.
4. Review runtime performance, polling/abort/timer ownership, route/data lazy loading,
   event-list pagination, stale lint suppressions, and demonstrably unused files.
   Remove only confirmed dead material; preserve operational configs and useful docs.
5. Address RCA-085 in a separate test-maintenance concern: exercise both legal workflow
   outcomes deterministically and retain simultaneous-race atomicity assertions.
   Do not require scheduler randomness to produce both winners, weaken race-safety
   checks, or use repeated reruns as the fix.
6. Reconcile README, CLAUDE, relevant AGENTS sections, and this completion matrix with
   the implementation. Record important fixes in RCA.md using all six required sections.

Honor the architecture:
- Java 17 + Spring Boot owns all business decisions. The React frontend calls APIs
  and presents facts; it does not invent prices, state transitions, race outcomes,
  hashes, FizzBuzz/parity rules, thread ownership, or semaphore permit counts.
- Interactive demos use isolated /sim/* state. Recorded concurrency experiments use
  one explicit backend run followed by local replay. Pausing replay does not control
  server threads. Aborting a browser request does not guarantee server cancellation.
- Preserve explicit COUNTERS/CONFIG map identity and H2O acquisition/departure semantics.
- Preserve the shared error contract, typed domain exceptions, single module-key
  resolver, module props, lazy route/data loading, catch-all routing, and existing
  learning/progress/reveal behavior. Add backend capabilities only for a demonstrated
  requirement; keep business logic and concurrency correctness on the backend.
- Retain the in-memory architecture. Do not expand scope into a database, authentication,
  new modules, or a framework replacement without an explicit new user requirement.

Environment and execution:
- Execute commands through WSL. If the current shell is already WSL, use it directly;
  from Windows invoke wsl. Never start, stop, or restart frontend/backend application
  servers automatically; the user owns their lifecycle.
- Validate using builds, tests, direct Java-service fixtures, MockMvc, and browser
  request interception where suitable. Use an already running user-managed instance
  for live checks if available. Distinguish mocked/intercepted browser evidence from
  real HTTP end-to-end evidence and report anything that could not be verified.
- Keep generated reports/build output out of Git. Preserve unrelated user changes;
  use an isolated worktree when needed. Do not delete other agents' unverified work.

Shipping and validation:
- Follow the repository branch -> conventional commits -> push -> PR -> green CI ->
  merge -> branch deletion workflow. Never commit directly to main. Authorization
  to complete this workflow is already given; proceed without routine confirmation.
- For each meaningful change, run focused behavioral tests. Before each PR, run the
  required full backend/frontend suites, frontend lint, Maven package, Vite build,
  and both CI chunk budgets: entry <= 500 * 1024 bytes; largest non-entry JavaScript
  chunk <= 250 * 1024 bytes. Do not introduce new lint violations or blanket suppressions.
- Browser-check changed flows in both themes, with keyboard and reduced motion, and
  on the relevant viewport sizes. Exercise success, invalid input, slow/failing
  requests, repeated clicks, navigation while work is pending, and recovery.
- Use real backend recordings for replay verification where possible. Inspect any
  failing assertion before changing code. Wait for every required check before merging.
- Keep work and evidence durable in the completion matrix. Give concise progress
  updates and continue across batches without asking me to say 'continue'. Ask only
  when a material product decision or genuinely missing prerequisite blocks progress.

Completion means all 60 modules have documented review outcomes; every confirmed
in-scope UX defect is fixed and merged; all applicable flows satisfy the shared
usability/lifecycle rules; required tests/builds/lint/budgets pass; browser evidence
covers the agreed matrix; and docs and Git state are current. Any unverified or
blocked criterion must be explicitly listed rather than counted as complete.
Finish with a concise report of shipped changes, validation, PR links, and any
remaining limitations or user-run verification steps. Do not stop after a plan,
one convenient batch, or a request for routine confirmation.
```

## Cleanup before handoff

The cleanup inspected all 434 frontend source files, following static imports,
literal dynamic imports, test entry points, and the route-page glob. No unreferenced
frontend source files were identified. Active dependencies, deployment files, local
IDE settings, instruction files, tests, and historical RCA/roadmap documentation
were retained. Generated build output and caches were moved out of the project.
Five unregistered agent directories were also moved to the external archive to
preserve potentially unique old work. Recovery location on this machine:
`/home/prem/.local/share/lld-with-ui-cleanup/archive-xbibEPyj/`.
These local artifacts are ignored by Git, so their removal from the project does
not appear as source deletions in the cleanup PR.
