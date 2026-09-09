# Portfolio Audit — 2026-09-08

A full `/audit-lld` pass across all 60 modules in the portfolio (51 standalone modules + 9
concurrency primitives), scored against the 17-criteria reference bar in
`.claude/skills/audit-lld/SKILL.md`. Read-only — this is a gap analysis, not a change log.
Six batches of 10-11 modules were audited in parallel by independent agents, each verifying
against source code rather than documentation claims.

## Summary table (worst-first)

| # | Module | Score | Top gap |
|---|---|---|---|
| 1 | `ttlcache` | 9/17 | No `/sim/*`, no Lombok, no `AGENTS.md` section, replay-only sim tab |
| 2 | `blockingqueue` | 10/17 | Same shape as ttlcache + no `AGENTS.md` section |
| 3 | `h2o` | 10/17 | Same shape + raw hex atom-bubble borders inconsistent with rest of file |
| 4 | `mergesort` | 10/17 | Same shape + raw hex fork/steal badge color |
| 5 | `tictactoe` | 11/17 | Zero GoF patterns anywhere in the module |
| 6 | `bloomfilter` | 11/17 | No `/sim/*`, replay-only sim, no Lombok |
| 7 | `concurrenthashmap` | 11/17 | Same |
| 8 | `fizzbuzz` | 11/17 | Same |
| 9 | `foobar` | 11/17 | Same |
| 10 | `zeroevenodd` | 11/17 | Same |
| 11 | `minesweeper` | 11/17 | 5-step sim (not 8), no HUD, no repo/strategy test |
| 12 | `library` | 12/17 | Bypasses `LldPage` (dead-code duplication), 17 hex literals |
| 13 | `linkedin` | 12/17 | Fake Strategy (1 impl each), bypasses `LldPage`, zero Lombok |
| 14 | `lrucache` | 12/17 | Uses `LldPage` but also duplicates `<ClassDiagram>`/`<DesignDetails>` — literal dead code |
| 15 | `movieticket` | 12/17 | Dead `Observer` interface — zero implementations — yet README claims it |
| 16 | `pubsub` | 12/17 | No locks anywhere (`synchronized` only), subscriber type is a raw string, fake Strategy |
| 17 | `snakeladders` | 12/17 | Has a per-game lock but no concurrency test exercises it at all |
| 18 | `trafficsignal` | 12/17 | Sim tab never calls the backend's own `/sim/*` engine — hits live endpoints, mock-data fallback |
| 19 | `elevator` | 13/17 | 53 hex literals (worst offender), unlocked lock-ordering undocumented |
| 20 | `featureflag` | 13/17 | Rule type is a raw string (no enum), no sim HUD |
| 21 | `hotel` | 13/17 | No repo/strategy test, no sim HUD |
| 22 | `logging` (**reference**) | 13/17 | No exception hierarchy at all — regression in a gold-standard module |
| 23 | `ludo` | 13/17 | No `LldPage`, zero live polling |
| 24 | `restaurant` | 13/17 | No `AGENTS.md` section at all despite full README entry |
| 25 | `shoppingcart` | 13/17 | No `repository` layer — raw maps live in the service |
| 26 | `stockbroker` | 13/17 | No `repository` layer, 3 models with no Lombok |
| 27 | `uber` (**reference**) | 13/17 | Controller does business logic; string-literal status routing bypassing its own enum |
| 28 | `vendingmachine` | 13/17 | Controller does business logic (slot lookup), manual exception catching duplicating the global handler |
| 29 | `blackjack` | 14/17 | Unlocked check-then-act race on table status in `doDeal`/`doHit`/`doStand` — verified, real bug |
| 30 | `chess` | 14/17 | 58 hex literals, no HUD, no polling |
| 31 | `coffeemachine` | 14/17 | 85 hex literals (worst in portfolio), bypasses `LldPage` |
| 32 | `coupon` | 14/17 | 5-step sim (not 8), no polling |
| 33 | `courseregistration` | 14/17 | No pattern package at all |
| 34 | `kvstore` | 14/17 | 6-step sim (not 8), no polling |
| 35 | `meetingscheduler` | 14/17 | No real second GoF pattern (README overstates it) |
| 36 | `payment` | 14/17 | Nested locks with no ordering comment, no polling |
| 37 | `threadpool` | 14/17 | 6/9 models have no Lombok |
| 38 | `zomato` | 14/17 | Docs claim Observer + payment Strategy that don't exist in code |
| 39 | `airline` | 15/17 | Bypasses `LldPage`, 72 hex literals |
| 40 | `cachelibrary` | 15/17 | 6-step sim (not 8) |
| 41 | `digitalwallet` | 15/17 | Single operational tab, hardcoded avatar-color palette (sim/UX bug fixed — PR #100) |
| 42 | `inventory` | 15/17 | Single operational tab |
| 43 | `jobscheduler` | 15/17 | No sim HUD |
| 44 | `locker` | 15/17 | 7-step sim (spec wants 8), close to reference quality otherwise |
| 45 | `notification` | 15/17 | Single operational tab |
| 46 | `parkinglot` | 15/17 | Hex literals only real gap |
| 47 | `ratelimiter` | 15/17 | Single operational tab |
| 48 | `socialnetwork` | 15/17 | Single operational tab |
| 49 | `splitwise` (**reference**) | 15/17 | No exception hierarchy — raw `RuntimeException`, falls through to default 500 |
| 50 | `workflow` | 15/17 | No live polling on Submit/Approve tabs |
| 51 | `atm` | 16/17 | No live polling — otherwise excellent (documented lock ordering, real 8-step sim) |
| 52 | `auction` | 16/17 | Status-badge hex literals only |
| 53 | `carrental` | 16/17 | 3 hex literals only |
| 54 | `concertticket` | 16/17 | 5 hex literals only |
| 55 | `cricinfo` | 16/17 | Hex literals only — otherwise reference-quality (real Observer, per-match lock) |
| 56 | `musicstreaming` | 16/17 | Single operational tab only — otherwise reference-quality |
| 57 | `stackoverflow` | 16/17 | Hex literals only |
| 58 | `taskmanagement` | 16/17 | Single operational tab only |
| 59 | `webcrawler` | 16/17 | 2 hex literals only |
| 60 | `circuitbreaker` | **17/17** | No gaps found — real State + Strategy patterns, full sim HUD, zero hex literals |

## Flagged loudly — real bugs, not style nits

These findings were recorded as open incidents in `RCA.md`: Blackjack's table-action race
([RCA-062](RCA.md#rca-062-blackjacks-table-actions-have-an-unlocked-check-then-act-race)),
Splitwise's untyped domain failures
([RCA-063](RCA.md#rca-063-splitwises-raw-runtimeexceptions-bypass-the-shared-domain-error-contract)),
Logging's missing module exception boundary
([RCA-064](RCA.md#rca-064-the-reference-logging-module-has-no-typed-domain-exception-boundary)),
Traffic Signal's live-state simulation wiring
([RCA-065](RCA.md#rca-065-traffic-signals-simulation-tab-bypasses-its-isolated-backend-engine)),
and the three pattern-claim mismatches
([RCA-066](RCA.md#rca-066-three-modules-overstate-or-lack-the-design-patterns-used-at-runtime)).
The audit itself was read-only. Post-audit remediation status as of 2026-09-09: RCA-062 through
RCA-065 are now resolved; RCA-066 remains open. RCA-067, found during the follow-up
Digital Wallet review, is also resolved.

1. **Blackjack: unlocked check-then-act race (resolved 2026-09-09, RCA-062).** The audited code
   read `table.getStatus()` then mutated with no aggregate lock. `BlackjackService` now holds a
   fair per-table lock across each complete action while retaining the shared shoe's lock-free
   `AtomicInteger` cursor for cross-table card allocation.
2. **Splitwise exception hierarchy (resolved 2026-09-09, RCA-063).** The audited code threw raw
   `RuntimeException` throughout the service and strategies. It now has typed 404/400/422 domain
   failures, shared live/simulation validation, and MockMvc coverage of `ErrorResponse`.
3. **Logging exception hierarchy (resolved 2026-09-09, RCA-064).** The audited code had zero
   `DomainException` subclasses and silently accepted unknown appenders. It now parses transport
   values at the service boundary, returns typed 400/404 `ErrorResponse`s, and applies the same
   appender/level contract to live and simulation endpoints.
4. **TrafficSignal simulation wiring (resolved 2026-09-09, RCA-065).** The audited frontend hit
   live endpoints and hid failures behind hardcoded state. Its eight-step walkthrough now uses
   only `/traffic/sim/*`, renders backend snapshot/event telemetry, and exposes retryable errors.
5. **Dead/false pattern claims (RCA-066, partially resolved).** MovieTicket's empty notifier and
   Observer claims were removed on 2026-09-09. Zomato's Observer/payment-Strategy documentation
   mismatch and TicTacToe's missing GoF pattern remain open.

## Three highest-value fixes, ranked

1. **Blackjack's table-status race (completed 2026-09-09)** — fixed with fair per-table
   `ReentrantLock`s around the check-and-mutate span in `doDeal`/`doHit`/`doStand` and three
   latch-controlled regression tests.
2. **Splitwise + Logging's missing exception hierarchies (completed 2026-09-09)** — both modules
   now expose typed domain failures through the shared `ErrorResponse` contract.
3. **TrafficSignal's dead sim engine (completed 2026-09-09)** — the frontend now drives the
   existing isolated engine exclusively, with API namespace and full-walkthrough isolation tests.

Everything else (hex-literal cleanup, tab-count nits, missing repo/strategy test files, `LldPage`
migration for the six modules that bypass it) is real but lower severity — candidates for batched
`upgrade-lld` passes rather than urgent fixes.
