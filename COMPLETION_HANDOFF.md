# LLD UI/UX completion handoff

Verified starting point: 2026-10-05, feature baseline `c588cd4` (PR #150).
This is the current UI/UX completion brief. `ROADMAP.md` records an older, completed
module-construction plan; its zero remaining modules does not mean the UI work is complete.

## Verified progress

- All 60 modules exist, with Java backends, routes, and design data.
- Homepage discovery, navigation memory, mobile tabs, and shared diagram zoom,
  fit-width, fullscreen, and keyboard controls have shipped.
- 16 modules use shared guided playback: car-rental, chess, circuit-breaker, elevator,
  lru-cache, ludo, movieticket, parking, rate-limiter, snakeladders, splitwise, thread-pool,
  tictactoe, traffic-signal, uber, zomato.
- Nine modules use shared recorded playback: blocking-queue, bloom-filter,
  concurrent-hashmap, fizz-buzz, foo-bar, h2o, merge-sort, ttl-cache, zero-even-odd.
- Last feature validation: 2304 backend tests, 575 frontend tests, and 15 Chromium
  scenarios across five routes at 320px light, 390px dark, and 1280px light. These
  browser checks cover the latest five-module batch, not every page of the project.
- Last feature build: entry 306858 bytes; largest non-entry JavaScript chunk 52445 bytes.
- Lint has 16 existing warnings and a suppression baseline; a successful lint exit
  is not evidence that every suppressed issue has been resolved.
- RCA-085 documents a flaky scheduler-distribution assertion in
  `WorkflowConcurrencyTest.approveAndEscalateRaceNeverBothTakeEffect`; rerunning CI
  cleared the interruption but did not fix the assertion.

## Remaining module review queue

These 35 modules do not currently import either shared playback implementation.
That is an inventory of migration candidates, not a finding that every module is broken
or needs identical controls. Audit each existing workflow and record the appropriate outcome.

airline, atm, auction, blackjack, cachelibrary, coffeemachine, concert-ticket, coupon,
course-registration, cricinfo, digitalwallet, featureflag, hotel, inventory, jobscheduler,
kvstore, library, linkedin, locker, logging-framework, meeting-scheduler, minesweeper,
music-streaming, notification, payment, pubsub, restaurant, shoppingcart, social-network,
stackoverflow, stock-brokerage, task-management, vendingmachine, webcrawler, workflow.

## Completion matrix

Shared playback adoption (25/60) is tracked separately from overall UX completion (0/60
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
  `accessibilityContracts.test.js` (RCA-087).
- **Status-token contrast (fixed, batch 2).** Light `--success/--danger/--warning/--info`
  and dark `--danger` failed 4.5:1 as text on their own tints. Light tokens are darkened in
  place and the dark danger tint alpha is lowered; the same test guards both.
- **Dark white-on-solid status colours (open).** At 69 sites (buttons, badges, step dots),
  white text on solid dark `--success/--warning/--info/--danger` is 1.9–3.35:1. This needs
  dedicated solid/`--on-*` tokens rather than a change to the text tokens.
- **Silent initial-load failures (open, batch 3).** In the intercepted run, coupon, airline
  and coffee-machine rendered no message when every `/api` call failed; digital-wallet,
  stock-brokerage and course-registration did.
- **320px page overflow (fixed, batch 2).** coupon 16px (fixed two-column grid → `auto-fit`),
  airline 6px (non-wrapping passenger picker and seat legend), course-registration 69px (tables
  now in a local `overflow-x: auto` container). Airline's passenger `<select>` also had
  `outline: none` and an unassociated label; both are fixed. Only six routes were measured, so
  overflow on the other routes is still unverified.
- **Standalone page shells (open, batch 3).** airline, coffeemachine, library, linkedin, ludo,
  movieticket and vendingmachine do not use `LldPage`; each hand-rolls its header, theme
  toggle, tabs, diagram/design wiring and solution gate. They miss shared navigation memory,
  mobile tab semantics and future shell fixes. Hardcoded banners in airline, library, linkedin, coffeemachine, and
  vendingmachine now use the tokens.
- **Swallowed load errors.** digitalwallet (**fixed**, batch 2); logging-framework (open, see
  below).
- **logging-framework live tab (open, batch 3).** Its mutation handlers lack `try/catch` and
  busy guards. Invalid MDC JSON is silently dropped. `scrollIntoView` on every 2 s poll can move
  the page. The fixed `1fr 2fr` grid is cramped at 320px, and the labels are not associated
  with their inputs.
- **Other uncleared animation timers (fixed, batch 1).** coffeemachine brew, vendingmachine
  slot spin and stackoverflow rejection flash now use the same hook.
- **Custom sim steppers (open).** Most of the 35 have their own Next/step state with no
  shared pause/reset/progress semantics; each needs an adopt-or-justify decision.

| Module | Playback | Inspection | Concrete gaps | Chosen interaction | Implementation | Test evidence | Browser coverage | PR |
|---|---|---|---|---|---|---|---|---|
| airline | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| atm | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| auction | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| blackjack | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| blocking-queue | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| bloom-filter | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| cachelibrary | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| car-rental | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| chess | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| circuit-breaker | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| coffeemachine | Not adopted | Static scan 2026-10-05 | brew-animation timer not cleared (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| concert-ticket | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| concurrent-hashmap | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| coupon | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| course-registration | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| cricinfo | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| digitalwallet | Not adopted | Static scan 2026-10-05 | live regions + swallowed load errors (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| elevator | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| featureflag | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| fizz-buzz | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| foo-bar | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| h2o | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| hotel | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| inventory | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| jobscheduler | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| kvstore | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| library | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| linkedin | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| locker | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| logging-framework | Not adopted | Manual review 2026-10-05 | No error handling/busy guards on mutations; silent bad JSON; poll-driven scroll; fixed grid at 320px; unlabeled inputs | Pending (batch 3) | Not started | — | Not yet | — |
| lru-cache | Shared guided | Shipped #141–#147 | Final cross-project audit pending | `SimulationControls` | Adopted | Existing sim suites | Partial (prior batches) | #141–#147 |
| ludo | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| meeting-scheduler | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| merge-sort | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| minesweeper | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| movieticket | Shared guided | Shipped #141–#147 | Final cross-project audit pending | `SimulationControls` | Adopted | Existing sim suites | Partial (prior batches) | #141–#147 |
| music-streaming | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| notification | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| parking | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| payment | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| pubsub | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| rate-limiter | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| restaurant | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| shoppingcart | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| snakeladders | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| social-network | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| splitwise | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| stackoverflow | Not adopted | Static scan 2026-10-05 | vote-reject flash timer not cleared (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| stock-brokerage | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| task-management | Not adopted | Static scan 2026-10-05 | live regions (**fixed**, batch 2) | Pending per-module review | Batch 2 a11y fix | `accessibilityContracts.test.js` | Not yet | Batch 2 PR |
| thread-pool | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| tictactoe | Shared guided | Shipped #141–#147 | Final cross-project audit pending | `SimulationControls` | Adopted | Existing sim suites | Partial (prior batches) | #141–#147 |
| traffic-signal | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| ttl-cache | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| uber | Shared guided | Shipped #141–#147 | Banner live region (**fixed**, batch 2); final cross-project audit pending | `SimulationControls` | Adopted; batch 2 a11y fix | Existing sim suites, `accessibilityContracts.test.js` | Partial (prior batches) | #141–#147, batch 2 PR |
| vendingmachine | Not adopted | Static scan 2026-10-05 | slot-spin timer not cleared (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| webcrawler | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| workflow | Not adopted | Static scan 2026-10-05 | flash timer race + unmount leak (**fixed**, batch 1); live regions (**fixed**, batch 2) | Pending per-module review | Batches 1–2 fixes | `transientMessage.test.jsx`, `accessibilityContracts.test.js` | Not yet | #152, batch 2 PR |
| zero-even-odd | Shared recorded | Shipped #148–#150 | Final cross-project audit pending | `RecordedTraceControls` | Adopted | Existing replay suites | #150 batch: 5 routes × 3 viewports | #148–#150 |
| zomato | Shared guided | Shipped #141–#147 | Final cross-project audit pending | `SimulationControls` | Adopted | Existing sim suites | Partial (prior batches) | #141–#147 |

### Batch log

| Batch | Scope | PR | Validation |
|---|---|---|---|
| 1 | Matrix, `useTransientMessage` across 17 pages (RCA-086) | #152 | 579 vitest, lint 16 (baseline), build budgets, 2308 mvn; CI green |
| 1b | RCA-085 deterministic workflow outcomes (separate PR) | #153 | `WorkflowConcurrencyTest` 6/6 ×3, 2308 mvn; CI green |
| 2 | Live regions on 77 banners, AA status tokens, wallet load errors (RCA-087) | _pending_ | _pending_ |

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
adoption from overall UX completion. The 25 adopted modules also need the final
cross-project audit. For each of the 35 remaining candidates, adopt the appropriate
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
