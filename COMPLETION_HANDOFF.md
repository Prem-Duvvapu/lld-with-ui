# LLD UI/UX completion handoff

Verified starting point: 2026-10-05, feature baseline `c588cd4` (PR #150).
This is the current UI/UX completion brief. `ROADMAP.md` records an older, completed
module-construction plan; its zero remaining modules does not mean the UI work is complete.

## Verified progress

- All 60 modules exist, with Java backends, routes, and design data.
- Homepage discovery, navigation memory, mobile tabs, and shared diagram zoom,
  fit-width, fullscreen, and keyboard controls have shipped.
- 17 modules use shared guided playback: car-rental, chess, circuit-breaker, elevator,
  lru-cache, ludo, movieticket, parking, rate-limiter, snakeladders, splitwise, thread-pool,
  tictactoe, traffic-signal, uber, zomato, logging-framework.
- Nine modules use shared recorded playback: blocking-queue, bloom-filter,
  concurrent-hashmap, fizz-buzz, foo-bar, h2o, merge-sort, ttl-cache, zero-even-odd.
- Latest batch validation: 2320 backend tests and 629 frontend tests. Chromium passed
  576 status-style cascade checks and 24 production-built route views / 56 control checks,
  covering both themes, mobile/desktop layouts, hover/focus, and keyboard actions.
  The preceding logging sandbox batch covered 16 accepted/filtered outcomes, recovery,
  and pending navigation. These are scoped checks, not a completed whole-project audit.
- Latest build: entry 310324 bytes; largest non-entry JavaScript chunk 55479 bytes.
- Lint has 14 existing warnings and a suppression baseline; a successful lint exit
  is not evidence that every suppressed issue has been resolved.
- RCA-085's flaky scheduler-distribution assertion was resolved in #153 using
  deterministic legal-outcome coverage while retaining simultaneous-race safety checks.

## Remaining module review queue

These 34 modules have not yet adopted either shared playback implementation.
That is an inventory of migration candidates, not a finding that every module is broken
or needs identical controls. Audit each existing workflow and record the appropriate outcome.

airline, atm, auction, blackjack, cachelibrary, coffeemachine, concert-ticket, coupon,
course-registration, cricinfo, digitalwallet, featureflag, hotel, inventory, jobscheduler,
kvstore, library, linkedin, locker, meeting-scheduler, minesweeper,
music-streaming, notification, payment, pubsub, restaurant, shoppingcart, social-network,
stackoverflow, stock-brokerage, task-management, vendingmachine, webcrawler, workflow.

## Completion matrix

Shared playback adoption (26/60) is tracked separately from overall UX completion (0/60
closed). A module is closed only when every column has evidence. "Static scan" means
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
  `--on-status-solid` now pair explicitly in 50 declarations across the shared danger
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
- **Silent typed API failures (open, batch 4).** With every `/api` call answered by a typed 503,
  28 routes render no message: parking-lot, zomato, uber, stackoverflow, tic-tac-toe,
  snake-ladders, atm, splitwise (other tabs), elevator, movie-ticket, chess, ludo, inventory,
  shopping-cart, minesweeper, lru-cache, pub-sub, car-rental, auction, concert-ticket, locker,
  payment, webcrawler, cachelibrary, kvstore, coupon, blackjack, workflow. Some of these fetch
  only on demand, so each needs a per-page decision. A real network outage is already covered
  by the global `BackendStatusBanner`. Hardcoded banners in airline, library, linkedin, coffeemachine, and
  vendingmachine now use the tokens.
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
| atm | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | #155 |
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
| kvstore | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, #155 |
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
| parking | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, #155 |
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

### Curriculum workstream

`LLD_LEARNING_CURRICULUM_PLAN.md` was merged in #159 with green CI. It specifies the
requested OOP, principles, patterns, UML, concurrency, and interview curriculum.
Its delivery phases remain pending; the plan is separate from this existing-module
UI/UX matrix. Do not infer curriculum completion from the historical 60-module roadmap.
The pattern inventory was checked on 2026-10-18: the original request named 22
patterns, and Interpreter is now an explicit proposed addition to complete the
23-pattern catalog (5 creational, 7 structural, 11 behavioral). The full curriculum
coverage audit and lesson implementation remain pending.

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
adoption from overall UX completion. The 26 adopted modules also need the final
cross-project audit. For each of the 34 remaining candidates, adopt the appropriate
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
