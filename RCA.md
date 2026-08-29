# Root Cause Analysis (RCA) & Incident Log

A centralized engineering log documenting issues, root cause analyses, diagnostic steps, and resolutions encountered during development and deployment of the **LLD-with-UI** portfolio.

---

## 📑 Incident Index

| RCA # | Date | Component / Domain | Issue Summary | Status |
|---|---|---|---|---|
| [RCA-001](#rca-001-swagger-ui-404-not-found-due-to-external-windows-tomcat-9-port-9090-collision) | 2026-08-18 | Backend / Swagger UI / Networking | `404 Not Found` (Apache Tomcat/9.0.68) on port 9090 due to background host process | Resolved |
| [RCA-002](#rca-002-duplicate-object-literal-keys-silently-discarding-design-content) | 2026-08-20 | Frontend / Data Layer | Duplicate keys in `designDetails.js` / `classDiagrams.js` let JavaScript discard 653 lines of richer content at parse time | Resolved |
| [RCA-003](#rca-003-domain-exceptions-surfacing-as-http-500-with-the-message-stripped) | 2026-08-20 | Backend / Error Contract | 23 domain exceptions across 4 modules returned bare `500` instead of the documented 4xx codes | Resolved |
| [RCA-004](#rca-004-eager-import-metaglob-shipping-all-45-module-pages-in-the-entry-chunk) | 2026-08-20 | Frontend / Bundling | Every visitor downloaded a 1,474 kB entry chunk containing all 45 pages | Resolved |
| [RCA-005](#rca-005-mismatched-prop-names-and-a-missing-route-alias-rendering-blank-pages) | 2026-08-20 | Frontend / Wiring | `lldKey` / `moduleKey` prop typos and a missing route alias produced blank tabs and a blank page | Resolved |
| [RCA-006](#rca-006-check-then-act-race-assigning-one-uber-driver-to-two-riders) | 2026-08-21 | Backend / Uber / Concurrency | Unsynchronised read-then-write in driver assignment let two riders both claim the same driver | Resolved |
| [RCA-007](#rca-007-zomato-branch-shipped-non-compiling-a-dead-applicationcontext-and-an-untested-agent-leak) | 2026-08-22 | Backend / Zomato / Build & Concurrency | Two build blockers took down all 30 modules' `ApplicationContext`, and the pool-scan agent-assignment path shipped with zero concurrency coverage for a real leaked-agent race | Resolved |
| [RCA-008](#rca-008-duplicate-spring-bean-name-across-modules-crashing-the-whole-applicationcontext) | 2026-08-24 | Backend / Car Rental / Spring Wiring | A `PricingStrategyFactory` class name reused from `parkinglot` collided under Spring's default simple-class-name bean naming, aborting `ApplicationContext` startup for every module, not just car-rental | Resolved |
| [RCA-009](#rca-009-a-one-time-bonus-strategy-re-firing-on-every-subsequent-vote) | 2026-08-24 | Backend / Stack Overflow / Reputation | A `ReputationStrategy` implementation modeled a one-time event as a per-vote calculation, so every vote on an already-accepted answer re-applied the accepted-answer bonus | Resolved |
| [RCA-010](#rca-010-fresh-git-worktrees-start-with-zero-installed-frontend-packages) | 2026-08-24 | Frontend / Environment / Git Worktrees | A fresh `git worktree` had no `frontend/node_modules`, so `vitest`/`vite build` failed with a misleading `ERR_MODULE_NOT_FOUND` that looked like a broken `vite.config.js` rather than a missing install | Resolved |
| [RCA-011](#rca-011-cricinfos-per-match-ball-lock-verified-and-a-case-only-filename-drift-on-the-wsl-mount) | 2026-08-24 | Backend / CricInfo / Concurrency & Environment | The per-match ball-recording lock was verified by disabling it (real lost/duplicated runs resulted); separately, a case-only filename rename silently failed to take effect on the WSL 9p mount | Resolved |
| [RCA-012](#rca-012-an-observer-registered-in-a-notifier-was-also-invoked-directly-double-firing-every-alert) | 2026-08-24 | Backend / Inventory / Observer | `InAppStockAlertObserver` was both a registered observer on `StockAlertNotifier` AND invoked directly by the same call site, so every stock alert was added to its feed twice | Resolved |
| [RCA-013](#rca-013-h2o-bonders-barrier-action-mutated-a-plain-arraylist-while-a-synchronized-reader-provided-no-real-mutual-exclusion) | 2026-08-25 | Backend / H2O / Concurrency | `H2OBonder.bond()` (the `CyclicBarrier` action appending each molecule's tokens) mutated a plain `ArrayList` without synchronizing, while the only other accessor was `synchronized` — a lock held on one side of a shared mutable field provides no mutual exclusion at all | Resolved |
| [RCA-014](#rca-014-snake-and-ladders-creategame-had-no-player-count-validation-and-crashed-with-an-unhandled-500-past-4-players) | 2026-08-25 | Backend / Snake & Ladders / Input Validation | `createGame` never validated player count against the 4-color token palette, so a 5th player name threw an unhandled `IndexOutOfBoundsException` (bare 500) instead of a typed 400 | Resolved |
| [RCA-015](#rca-015-minesweepers-mine-placement-loop-could-spin-forever-on-an-unvalidated-mine-count) | 2026-08-25 | Backend / Minesweeper / Input Validation & Availability | `placeMines`'s `while (placed < totalMines)` loop had no termination guarantee once `totalMines >= rows * cols`, spinning one CPU core forever on a single bad request | Resolved |
| [RCA-016](#rca-016-minesweepers-reveal-and-flag-endpoints-skipped-bounds-checking-and-threw-an-unhandled-500) | 2026-08-25 | Backend / Minesweeper / Input Validation | `revealCell`/`flagCell` indexed the board with caller-supplied `row`/`col` with no bounds check, so an out-of-range request threw a bare, unhandled `ArrayIndexOutOfBoundsException` (500, message stripped) | Resolved |
| [RCA-017](#rca-017-digital-wallets-repository-returned-wallets-in-unspecified-concurrenthashmap-iteration-order) | 2026-08-25 | Backend / Digital Wallet / Data Consistency | `WalletRepository#getAllWallets` returned `ConcurrentHashMap.values()` with no explicit ordering, so `GET /api/wallet` and the new `/sim/*` snapshot's wallet order was unspecified rather than the implied ascending-id order the new sim frontend relies on | Resolved |

---

## RCA-001: Swagger UI 404 Not Found due to External Windows Tomcat 9 Port 9090 Collision

### 1. Incident Overview
- **Date / Time**: 2026-08-18 22:15 IST
- **Severity**: High (Blocked access to Swagger UI & REST API verification)
- **Impacted Area**: Spring Boot REST API (`http://localhost:9090`), Swagger UI (`/swagger-ui.html`, `/swagger-ui/index.html`)

---

### 2. Symptoms & Error Log
When attempting to access `http://localhost:9090/swagger-ui.html` in the browser, the server responded with an Apache Tomcat error page:

```text
HTTP Status 404 – Not Found
Type Status Report
Message The requested resource [/swagger-ui.html] is not available
Description The origin server did not find a current representation for the target resource or is not willing to disclose that one exists.

Apache Tomcat/9.0.68
```

---

### 3. Root Cause Analysis (RCA)
1. **Container Version Discrepancy**: 
   - Our Spring Boot 3.2.0 backend runs an embedded **Apache Tomcat/10.1.16** container (Jakarta EE 10 servlet spec).
   - The returned error page explicitly identified the server as **Apache Tomcat/9.0.68** (Java EE 8 servlet spec).
2. **Host Port Binding Collision**:
   - A standalone Windows Service / process (`Tomcat9.exe`, PID `5712`) was already running on the Windows host and listening on TCP port `9090`.
   - Browser requests to `http://localhost:9090` were being intercepted and handled by the external Tomcat 9 server (which had no `/swagger-ui.html` endpoint deployed), rather than reaching our Spring Boot application.
3. **Privilege Limitations**:
   - Attempting `Stop-Service Tomcat9` in a standard (non-admin) PowerShell session failed due to Windows Service Controller permission restrictions (`Cannot open Tomcat9 service on computer '.'`).

---

### 4. Diagnostic Steps
To identify which process is holding port `9090`:

#### Windows PowerShell:
```powershell
# Identify process details occupying port 9090
Get-Process -Id (Get-NetTCPConnection -LocalPort 9090).OwningProcess

# Output:
# Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName       
# -------  ------    -----      -----     ------     --  -- -----------       
#     515      31   247080      71384              5712   0 Tomcat9
```

#### WSL / Linux:
```bash
lsof -i :9090
# or
ss -lptn 'sport = :9090'
```

---

### 5. Resolution & Recovery

#### Immediate Fix (Kill conflicting process by PID without needing Admin rights):
```powershell
# Windows PowerShell
Stop-Process -Id 5712 -Force

# Or Windows Command Prompt (CMD)
taskkill /PID 5712 /F

# Or WSL / Linux
fuser -k 9090/tcp
```

#### If Stopping as a Windows Service (Requires Admin PowerShell):
```powershell
Stop-Service Tomcat9
```

#### Start Spring Boot Backend:
```bash
cd backend
mvn spring-boot:run
```
Verify startup log displays:
```text
Tomcat started on port 9090 (http) with context path '' [Apache Tomcat/10.1.16]
Started LldApplication in ... seconds
```

#### Access Verified Endpoints:
- **Swagger UI**: [http://localhost:9090/swagger-ui/index.html](http://localhost:9090/swagger-ui/index.html) *(or `/swagger-ui.html`)*
- **OpenAPI JSON Spec**: [http://localhost:9090/v3/api-docs](http://localhost:9090/v3/api-docs)

---

### 6. Preventative & Best Practices
1. **Pre-flight Port Verification**: Always check port availability with `fuser -k 9090/tcp` (WSL) or `Get-NetTCPConnection -LocalPort 9090` (Windows) before launching dev servers.
2. **Alternative Port Configuration**: If an external Tomcat 9 server is required for other workloads, change our application port in `application.properties` (`server.port=9091`) and update `vite.config.js` proxy target accordingly.

---

## RCA-002: Duplicate Object-Literal Keys Silently Discarding Design Content

### 1. Incident Overview
- **Date**: 2026-08-20
- **Severity**: High (silent, ongoing content loss across 7 modules; no error surfaced anywhere)
- **Impacted Area**: `frontend/src/data/designDetails.js`, `frontend/src/data/classDiagrams.js`

### 2. Symptoms
No error, no warning, no failing test. Modules simply displayed a *thinner* Design Details or Class Diagram tab than the content that existed in the repository:

- Movie Ticket's Design Details rendered an **empty `<h3>` heading**, because the surviving entry had no `title` field.
- Coffee Machine's Class Diagram showed **6 classes** while a **19-class** diagram sat in the same file.
- Stock Brokerage's Class Diagram was **blank**.
- Zomato showed 15 requirements and no trade-offs section; a richer entry with 8 more requirements and 4 trade-offs existed.

### 3. Root Cause
Both files were single object literals of ~5,400 and ~1,000 lines that had grown by appending a new block per module. Seven keys were declared **twice in the same literal**:

```js
const designDetails = {
  zomato: { /* 171 lines, includes tradeoffs */ },   // <-- discarded by the parser
  ...
  zomato: { /* 50 lines  */ },                       // <-- this one wins
};
```

Per the ECMAScript object-initialiser semantics, a later duplicate property **overwrites** the earlier one. There is no error and no warning: `Object.keys()` simply returns 41 entries for 48 declared blocks. In three of the seven cases the *richer* entry was the one discarded — 653 lines of authored content unreachable.

A second, distinct defect compounded it: four modules had content under two *different* spellings (`pubSub` / `pubsub`, `stockBrokerage` / `stockbroker`, `lruCache` / `lrucache`, `coffee` / `coffeemachine`). The lookup order in `DesignDetails.jsx` (exact → camelCase → de-hyphenated) picked whichever matched first, not whichever was better — and the two files disagreed about which spelling was richer, so Pub/Sub got its better *design details* but its weaker *diagram*.

### 4. Diagnostic Commands
```bash
# Count declared blocks vs surviving keys
grep -cE "^  '?[A-Za-z][A-Za-z0-9_-]*'?\s*:\s*\{\s*$" frontend/src/data/designDetails.js   # 48
node --input-type=module -e "import d from './src/data/designDetails.js'; \
  console.log(Object.keys(d).length)"                                                          # 41

# Identify which duplicate wins and how much is discarded
python3 - <<'EOF'
import re, collections
lines = open('frontend/src/data/designDetails.js').read().split('\n')
keys = [(m.group(1), i+1) for i, l in enumerate(lines)
        if (m := re.match(r"^  '?([A-Za-z][A-Za-z0-9_-]*)'?\s*:\s*\{\s*$", l))]
for k, c in collections.Counter(k for k, _ in keys).items():
    if c > 1:
        print(k, [ln for kk, ln in keys if kk == k])
EOF
```

### 5. Resolution
1. Extracted all 48 + 42 declared blocks from source text (not via `import`, which only yields survivors) by rewriting each key with a unique suffix and importing the result.
2. Merged per module **field by field**, taking the richest variant of each field — necessary because neither spelling dominated: `pubSub` had the better `requirements`/`principles` while `pubsub` had the only `tldr` and `tradeoffs`.
3. Split both stores into **one file per module** under `frontend/src/data/design/` and `frontend/src/data/diagrams/`, re-exported through a barrel index. Duplicate keys are now structurally impossible — a module is a filename.
4. Extracted the duplicated lookup logic from `DesignDetails.jsx` and `ClassDiagram.jsx` into a single `frontend/src/data/moduleKeys.js`, which is what let the two drift apart.
5. Authored the two class diagrams that were genuinely absent (`library`, `inventory`) from the backend sources.

Net effect: **14 modules gained content**, zero regressed (verified field-by-field against the pre-change live values).

### 6. Preventative Measures
1. **One file per module.** The structural fix; a duplicate now requires two files with the same name.
2. **`designDataCoverage.test.js`** (237 assertions) enforces: every module id any page requests resolves to data; every entry has a non-empty `title`, `requirements`, `entities` and `designPatterns`; every barrel key is declared exactly once; every file in the directory is registered in the barrel.
3. **Dangling-edge check.** `ClassDiagram` looks up relationship endpoints with `querySelector([data-class="…"])` and silently drops an edge that misses, so the suite asserts every `from`/`to` names a declared class. This immediately caught a real dangling `BankingService` edge in the ATM diagram.
4. **Dev-time warning.** Both components now `console.warn` in DEV when a module resolves to nothing, instead of rendering a silent empty state.

---

## RCA-003: Domain Exceptions Surfacing as HTTP 500 With the Message Stripped

### 1. Incident Overview
- **Date**: 2026-08-20
- **Severity**: High (every domain rule violation in 4 modules was unreportable to the user)
- **Impacted Area**: `airline`, `library`, `linkedin`, `stockbroker`

### 2. Symptoms
Any domain rule violation returned `HTTP 500` with no usable body. The UI, whose `apiFetch` reads `body.error || body.message`, fell through to its last resort and displayed:

```text
HTTP 500 Internal Server Error
```

A caller trying to hold a seat another passenger already held, borrow a book with no copies left, or trade without funds got no reason at all — while `AGENTS.md` and `README.md` both documented precise codes (`409`, `410`, `422`, `404`).

### 3. Root Cause
Two independent causes stacked:

1. **No status mapping existed.** The four modules declared 27 exceptions in clean hierarchies (`SeatNotAvailableException extends AirlineException extends RuntimeException`) but had **no `@ResponseStatus`, no `@ControllerAdvice`, and zero `try`/`catch` in their controllers**. An uncaught `RuntimeException` from a `@RestController` is a 500 by definition. The documented status codes existed only in prose. (`movieticket` was the sole module that had done this properly, via `@ExceptionHandler` methods on the controller itself.)
2. **Spring Boot 3 strips messages by default.** `server.error.include-message` defaults to `never`, so even the fallback error body carried an empty `message` — which is why the frontend had nothing to show.

A third, related defect made error reporting itself fragile: `Map.of("error", e.getMessage())` appeared **92 times** across 16 other controllers. `Map.of` throws NPE on a null value, and `getMessage()` is null for `NullPointerException` and many `ClassCastException`s — precisely the failures those `catch (Exception e)` blocks were wrapping. The handler threw while handling, converting an intended 400 into a 500.

### 4. Diagnostic Commands
```bash
# Exceptions with no status mapping and no controller-level handling
for m in airline library linkedin stockbroker; do
  printf "%-14s exceptions=%s @ResponseStatus=%s ControllerAdvice=%s catches=%s
" "$m"     "$(ls backend/src/main/java/com/lld/$m/exception/*.java | wc -l)"     "$(grep -rl '@ResponseStatus' backend/src/main/java/com/lld/$m | wc -l)"     "$(grep -rl 'ControllerAdvice' backend/src/main/java/com/lld/$m | wc -l)"     "$(grep -rc 'catch (' backend/src/main/java/com/lld/$m/controller/*.java | awk -F: '{s+=$2} END{print s+0}')"
done

# The null-message hazard
grep -rn 'Map.of("error", e.getMessage())' backend/src/main/java --include='*.java' | wc -l   # 92
```

### 5. Resolution
1. Added `com.lld.config.DomainException`, an abstract `RuntimeException` base. Each module's base exception now extends it, so the advice can match a whole hierarchy without `config` importing every module. *A marker interface was the first attempt and does not compile — `@ExceptionHandler` requires a `Class<? extends Throwable>`.*
2. Added `@ResponseStatus` to all 23 concrete exceptions, using the codes the docs already promised.
3. Added `com.lld.config.GlobalExceptionHandler` (`@RestControllerAdvice`) resolving the status from `@ResponseStatus` on the concrete class, defaulting to 400 — a domain rule violation is the caller's fault, never a 5xx. Kept **deliberately narrow** (domain exceptions plus `IllegalArgument`/`IllegalState`/`NoSuchElement`) so Spring's own routing, media-type and validation handling is untouched. An earlier draft with a broad `@ExceptionHandler(RuntimeException.class)` was discarded for exactly this reason.
4. Added `com.lld.config.ErrorResponse`, a record with a guaranteed non-null `error` (falling back to the exception's simple name), and replaced all 92 unsafe sites plus 13 more that paired a null-prone message with a simulation snapshot.
5. Set `server.error.include-message=always` so anything still reaching the default error body keeps its reason.

### 6. Preventative Measures
1. **`DomainExceptionContractTest`** scans the real classpath for every `DomainException` subclass and fails the build if a concrete one lacks `@ResponseStatus`, or if any domain exception is mapped to a 5xx. A newly added exception cannot silently become a 500.
2. **`GlobalExceptionHandlerTest`** asserts all 23 exception→status mappings explicitly, so a status change is a deliberate, visible edit.
3. **`ErrorContractIntegrationTest`** drives real requests through MockMvc, proving the advice is registered and reached — not merely correct in isolation — and asserting that a genuinely unmapped path still gets Spring's own 404.
4. **`ErrorResponseTest`** pins the null-message behaviour, including an assertion that the *old* `Map.of` idiom throws, so the reason for the change stays documented in code.

---

## RCA-004: Eager `import.meta.glob` Shipping All 45 Module Pages in the Entry Chunk

### 1. Incident Overview
- **Date**: 2026-08-20
- **Severity**: Medium (performance; every visitor paid for all 45 modules to view one)
- **Impacted Area**: `frontend/src/App.jsx`

### 2. Symptoms
`npm run build` emitted a single JavaScript chunk and Vite's own size warning:

```text
dist/assets/index-qNWjYUea.js   1,474.33 kB │ gzip: 364.71 kB
(!) Some chunks are larger than 500 kB after minification.
```

### 3. Root Cause
```js
const lldModules = import.meta.glob('./lld/**/*.jsx', { eager: true })
```

`eager: true` resolves every match at build time into static imports, so all 45 page components — Zomato alone is 1,655 lines — landed in the entry chunk regardless of route. The glob pattern `*.jsx` also swept in `src/lld/pub-sub/`, a 499-line directory that **no route referenced** (the `pub-sub` path maps to `lld/pubsub/`), so dead code was being shipped too.

### 4. Diagnostic Commands
```bash
cd frontend && rm -rf dist && npm run build      # observe single chunk + size warning
grep -n "import.meta.glob" src/App.jsx
# Find page files no route points at:
grep -oE "module: '\./lld/[^']+'" src/App.jsx | sort -u > /tmp/routed
find src/lld -name '*Page.jsx' | sed "s|^|module: './|;s|$|'|" | sort -u | comm -23 - /tmp/routed
```

### 5. Resolution
1. Dropped `eager` and narrowed the pattern to `'./lld/**/*Page.jsx'`.
2. Wrapped each loader in `React.lazy`, memoised in a `Map` so alias routes (`/tic-tac-toe` and `/tictactoe`) share one component, and wrapped `<Routes>` in `<Suspense>` with a fallback built from the existing `Skeleton` component.
3. Deleted the unroutable `src/lld/pub-sub/` directory and the unused `components/ui/Modal.{jsx,css}`.

Entry chunk: **1,474 kB → 260 kB** (365 kB → 83 kB gzip); each page is now its own 13–50 kB chunk fetched on first visit. Vite's size warning is gone.

**Known residual:** the design-data barrels still import all module files eagerly, producing a ~300 kB shared chunk. It is off the entry path — fetched only when a Design Details or Class Diagram tab is first opened — so it was left as a follow-up rather than making those components async.

### 6. Preventative Measures
1. `routing.test.js` asserts every page file is reachable through some route, so unroutable directories cannot accumulate.
2. Same suite asserts every route points at a file that exists and that no route path is declared twice.

---

## RCA-005: Mismatched Prop Names and a Missing Route Alias Rendering Blank Pages

### 1. Incident Overview
- **Date**: 2026-08-20
- **Severity**: Medium (user-visible blank page and four permanently empty tabs)
- **Impacted Area**: `AtmPage.jsx`, `pubsub/PubSubPage.jsx`, `App.jsx`, `Home.jsx`

### 2. Symptoms
- Clicking **Snake & Ladders** on the home page produced a **completely blank page** — layout chrome, no content.
- ATM's *Class Diagram* and *Design Details* tabs both read "not available", despite both having substantial content in the data files.
- Pub/Sub's two design tabs did the same.

### 3. Root Cause
Three separate wiring slips, all silent:

1. `Home.jsx` linked Snake & Ladders to `/snakeladders`; `App.jsx` registered only `/snake-ladders`. Every other module with two spellings had both registered (`tictactoe`, `hotel`, `airline`, `inventory`, `shoppingcart`, `pubsub`), so this was an omission rather than a design choice.
2. **No catch-all route existed.** With no `path="*"`, React Router matched nothing and rendered nothing — turning a wrong link into a blank page instead of a visible error. This is what kept (1) unnoticed.
3. `AtmPage` passed `lldKey="atm"` and `PubSubPage` passed `moduleKey="pubsub"`, but both components destructure `{ module }`. The prop arrived `undefined`, the lookup returned nothing, and the components rendered their empty state. React does not warn about unknown props on a custom component.

A related trap found while fixing this: `LldPage` renders the built-in `design`/`diagram` tabs *itself* and suppresses `children` for them, so a page that also renders `<ClassDiagram>` inside its children for those tabs is writing dead code. `LruCachePage` did exactly that — its `module="lrucache"` calls never ran, and the live key was `LldPage`'s `module="lru-cache"`.

### 4. Diagnostic Commands
```bash
# Home links with no matching route
node -e "
const fs=require('fs'), app=fs.readFileSync('frontend/src/App.jsx','utf8'),
      home=fs.readFileSync('frontend/src/pages/Home.jsx','utf8');
const routes=new Set([...app.matchAll(/path: '([^']+)'/g)].map(m=>m[1]));
const targets=[...home.matchAll(/'[^']+': '([a-z0-9-]+)'/g)].map(m=>m[1]);
console.log(targets.filter(t=>!routes.has(t)));"

# Pages handing the design components the wrong prop
grep -rn '<ClassDiagram\|<DesignDetails' frontend/src/lld/ | grep -v 'module='
```

### 5. Resolution
1. Registered the `snakeladders` alias route.
2. Added a `path="*"` route rendering a themed 404 with a link home, so an unknown path is now visible instead of blank.
3. Renamed both props to `module`.

### 6. Preventative Measures
1. **`routing.test.js`** asserts every home-page card links to a registered route, every card has a link target at all, no duplicate route paths, and that a catch-all route exists.
2. **`designDataCoverage.test.js`** derives the module ids from the page sources — reading both the `<LldPage module=…>` and the direct `<ClassDiagram module=…>` positions — and asserts each one resolves. A prop typo now fails the build, because the id it scans for simply will not be there.
3. The nine concurrency modules that genuinely have no content yet sit in an explicit `PENDING_DESIGN_CONTENT` allowlist, with a test asserting they are *still* uncovered — so the list cannot rot into a place where real gaps hide.

---

## RCA-006: Check-Then-Act Race Assigning One Uber Driver to Two Riders

**Severity:** High
**Date:** 2026-08-21
**Status:** Resolved
**Affected:** `com.lld.uber.service.UberService` (driver assignment), `com.lld.uber.model.Driver`

### 1. Overview & Severity
Accepting a ride read a driver's availability and then wrote their status with nothing holding
the driver in between. Two riders accepting the same driver concurrently could both pass the
availability check before either wrote, so both rides became `ACCEPTED` bound to the same driver
and the same vehicle. High severity: it silently double-books a real resource, and the second
rider has no way to detect it — the API returns success to both.

### 2. Symptoms & Error Logs
No exception, no log line, no failing request. That is what makes this class of bug dangerous:
the failure is a corrupt end state, not an error. Reproduced by two threads released together:

```
rideA -> ACCEPTED, driverId=D1, vehicle=KA-01-D1
rideB -> ACCEPTED, driverId=D1, vehicle=KA-01-D1   <-- same driver, both succeeded
repository.getDriver("D1").getStatus() == ON_TRIP  <-- one write silently overwrote the other
```

### 3. Root Cause
Textbook check-then-act. The code was:

```java
if (!driver.isAvailable()) {          // check  — thread A and thread B both pass
    throw new RuntimeException(...);
}
driver.setStatus(DriverStatus.ON_TRIP); // act    — both write; the second wins
```

`ConcurrentHashMap` makes each individual `get` and `put` atomic, but it cannot make a
*read-then-decide-then-write* sequence atomic — that requires the caller to hold a lock across
the whole compound operation. The module had thread-safe storage and still had a race, which is
the standard trap: a concurrent collection guarantees the safety of each operation, never the
safety of a sequence of them.

### 4. Diagnostic Commands
```bash
# Compound read-then-write on the same entity inside a service
grep -rn "isAvailable()\|getStatus() ==" backend/src/main/java/com/lld/uber/service/

# Does anything actually hold a lock across the decision?
grep -rn "ReentrantLock\|synchronized" backend/src/main/java/com/lld/uber/

# Confirm the race exists before fixing it — two threads, one driver
mvn -o test -Dtest='UberConcurrencyTest#twoRidersRacingForOneDriver_onlyOneWins'
```

### 5. Step-by-Step Resolution
1. Extracted assignment into `DriverAssignmentService`, so the contended operation has one owner
   rather than being inlined in a general-purpose service method.
2. Added a fair per-driver `ReentrantLock`, kept in a `ConcurrentHashMap` and created with
   `computeIfAbsent` so two threads cannot mint two different locks for the same driver.
3. **Re-read the driver from the repository inside the lock and re-checked availability there** —
   the line the original was missing. Checking a stale object read before the lock would have
   reproduced the same bug with more ceremony.
4. Also re-checked that the ride has no driver yet, closing the mirror-image race where many
   drivers accept one ride.
5. Threw `DriverUnavailableException` (409) for the loser instead of a bare `RuntimeException`,
   so the rejected rider gets a real status code rather than a 500.
6. Documented the lock ordering in the class javadoc: only one lock is ever held, so deadlock is
   not possible; a future change needing both a driver and a ride lock must take driver-then-ride.
7. Verified by disabling the lock and re-running `UberConcurrencyTest`. The first attempt at this
   was itself instructive: with the lock removed the tests still **passed**, because the delay used
   to widen the window had been placed *before* the availability check rather than between the
   check and the write — leaving the actual unguarded gap nanoseconds wide. Moving the delay into
   the real window made four tests fail immediately (2 winners instead of 1, 14 of 20, 10 of 10),
   proving the assertions do detect the defect. The lock was then restored and the file confirmed
   byte-identical to the committed version.

### 6. Preventative Measures
1. **`UberConcurrencyTest`** guards it with four scenarios: two riders racing one driver, twenty
   riders storming one driver, ten drivers racing one ride, and ten disjoint pairs that must all
   succeed (proving the per-driver lock does not serialise unrelated work). All release their
   threads from a single `CountDownLatch` — staggered starts do not race.
2. Each test asserts an **invariant** (`exactly one winner`, `exactly one driver ON_TRIP`) rather
   than a timing, so it cannot pass by luck, and every wait is bounded so a deadlock fails the
   test instead of hanging CI.
3. `repeatedRaceNeverProducesTwoWinners` runs the two-rider race 300 times with fresh state each
   round. A single run can pass by luck — the unguarded window is only nanoseconds wide, so one
   attempt may simply fail to interleave, which is exactly what the first verification attempt
   showed. Repetition makes a narrow window overwhelmingly likely to be hit at least once.
4. The tests were verified to fail against the unguarded implementation (see step 7 above). A
   concurrency test that still passes against the broken code certifies the bug as fixed and is
   worse than no test at all — and it is easy to write one by accident.
5. `AGENTS.md` records the pattern for the other modules: `ConcurrentHashMap` for storage,
   `ReentrantLock` for any compound mutation, and a comment stating the lock ordering.

---

## RCA-007: Zomato Branch Shipped Non-Compiling, a Dead ApplicationContext, and an Untested Agent Leak

**Severity:** Critical
**Date:** 2026-08-22
**Status:** Resolved
**Affected:** `com.lld.zomato.service.{ZomatoService,DeliveryAssignmentService}`,
`com.lld.zomato.strategy.DeliveryFeeStrategyFactory`, `ZomatoServiceTest`, `ZomatoConcurrencyTest`,
`frontend/src/lld/zomato/ZomatoPage.jsx` — and, transitively, every one of the other 29 backend
modules via the shared Spring `ApplicationContext`.

### 1. Overview & Severity
Commit `510ee6e` landed on `feat/zomato-module-depth` under time pressure and was explicitly
flagged in its own commit message as "WIP" with a "Not yet done" list. Two of the four problems it
fixed were build blockers: `mvn test` could not even compile, which means **no test in the entire
203-test suite had ever run on this branch** — not just zomato's. The second blocker was worse than
a red build: `ZomatoService` had two public constructors with no `@Autowired` hint, so Spring could
not disambiguate which one to use and the whole `ApplicationContext` failed to start. Since
`LldApplication` boots all 30 module packages in one context, one module's ambiguous bean took down
every module's integration tests, including `ErrorContractIntegrationTest`. Separately, the commit
fixed a real concurrency defect — two threads assigning the *same* order could each claim a
*different* agent and leak the loser out of the pool forever — but left the fix's only regression
test covering a secondary code path that production code never calls. Combined severity: Critical.
A non-compiling branch and a dead `ApplicationContext` are total build failures; the untested
production path meant the leaked-agent race could still resurface with zero test signal.

### 2. Symptoms & Error Logs
```
# Blocker 1 — test sources do not compile
[ERROR] .../ZomatoServiceTest.java:[NN,NN] local variables referenced from a lambda expression
        must be final or effectively final
        (order was reassigned by service.markReadyForPickup(...) and then captured in a
        lambda passed to assertThrows/assertDoesNotThrow later in the same test method)

# Blocker 2 — ambiguous constructor, whole context fails to load
[ERROR] Parameter 0 of constructor in com.lld.zomato.service.ZomatoService required a single
        constructor, but 2 were found
org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with
        name 'zomatoController' ... nested exception is
        org.springframework.beans.factory.BeanCreationException: ... Ambiguous constructors
[ERROR] Tests run: 5, Failures: 0, Errors: 5  -- ErrorContractIntegrationTest (every module,
        not just zomato — the whole context refused to start)

# Leaked-agent race (pre-fix), reproduced by two threads sharing one order
Thread-A: candidates = [AGENT-1, AGENT-2]; locks AGENT-1; claims it; order.agentId = AGENT-1
Thread-B: candidates = [AGENT-1, AGENT-2]; locks AGENT-2 (AGENT-1 still "available" from B's
          stale read of the candidate list); claims it; order.agentId = AGENT-2  <-- overwrites A
repository.getDeliveryAgent("AGENT-1").isAvailable() == false   <-- permanently unavailable
repository.getOrder(orderId).getDeliveryAgentId() == "AGENT-2"  <-- but no order references AGENT-1
# AGENT-1 is now leaked: unavailable forever, assigned to no order, never released.
```

### 3. Root Cause
Three independent root causes bundled into one WIP commit:

1. **Effectively-final violation.** A test method reassigned a local `order` variable (rebinding it
   to the result of `service.markReadyForPickup(...)`) and then referenced that same variable
   inside a lambda passed to `assertThrows`/`assertDoesNotThrow` later in the method. Java requires
   captured locals to be final or effectively final; a lambda closes over the *variable*, not a
   snapshot of its value, so the compiler rejects any capture of a variable that is reassigned
   anywhere in its scope — this is a hard compile error, not a warning.
2. **Ambiguous bean constructor.** `ZomatoService` had grown a second, one-argument constructor
   (probably left over from before `DeliveryAssignmentService` was introduced) alongside the
   two-argument constructor Spring was actually meant to use. With more than one public constructor
   and no `@Autowired` to pick a winner, Spring's constructor-resolution strategy has no rule to
   apply and fails bean creation outright — and because `LldApplication` boots all 30 module
   packages into a single context, that failure is global, not scoped to zomato.
3. **Leaked-agent race — lock scope too narrow.** `DeliveryAssignmentService.assignAgent()` (and
   `assign()`) originally serialised only on a per-*agent* `ReentrantLock`. That is sufficient to
   stop two orders from claiming the *same* agent, but it does nothing when two threads are
   assigning the *same order* to two *different* agents: each thread takes a different agent's
   lock, so they never contend, and both write `order.setDeliveryAgentId(...)` — the second write
   silently wins, permanently stranding the first agent as `unavailable` with no order pointing
   back at it. Classic check-then-act, but at the *order* granularity rather than the *agent*
   granularity the original lock protected.

A fourth, adjacent gap was caught but is process rather than product: the regression test added for
root cause 3 (`ZomatoConcurrencyTest`) exercised only `assign(orderId, agentId)` — the path that
claims one pre-chosen agent. `assignAgent(orderId)` — the pool-scan path that `ZomatoService`
actually calls in both the real flow (`markReadyForPickup`) and the `/sim/*` engine (`simReady`) —
had no concurrency test at all. Disabling the per-agent lock inside `assign()` failed 4 of 7
existing tests; disabling it inside `assignAgent()` left all 7 green. A fix with no test on its own
call path is one refactor away from silently regressing.

### 4. Diagnostic Commands
```bash
# Blocker 1: does the branch even compile?
mvn -o -q compile
mvn -o test 2>&1 | grep -i "must be final or effectively final"

# Blocker 2: is a @Service hiding more than one public constructor?
grep -n "public ZomatoService(" backend/src/main/java/com/lld/zomato/service/ZomatoService.java
mvn -o test -Dtest='com.lld.config.ErrorContractIntegrationTest' 2>&1 | tail -30

# Root cause 3: which lock actually guards assignAgent vs assign?
grep -n "orderLockFor\|lockFor\|assignAgent\|public DeliveryAgent assign" \
  backend/src/main/java/com/lld/zomato/service/DeliveryAssignmentService.java

# Which path does production code actually call?
grep -n "assignAgent(orderId)\|\.assign(" backend/src/main/java/com/lld/zomato/service/ZomatoService.java

# Does the fix's own regression suite cover that path? (it didn't, before this RCA)
grep -n "assignAgent(" backend/src/test/java/com/lld/zomato/ZomatoConcurrencyTest.java
```

### 5. Step-by-Step Resolution
1. Fixed the lambda capture in `ZomatoServiceTest` by not reusing the reassigned `order` variable
   inside the later lambda, restoring compilability so the suite could run at all.
2. Removed the unused one-argument `ZomatoService` constructor, leaving the two-argument
   `(ZomatoRepository, DeliveryAssignmentService)` constructor as the sole public constructor so
   Spring's implicit single-constructor autowiring applies with no ambiguity.
3. Added a per-*order* `ReentrantLock` (`orderLockFor`), taken **before** the per-agent lock in
   both `assignAgent()` and `assign()`, with lock ordering fixed as order-then-agent everywhere so
   the two lock types can never deadlock. Re-verified inside the order lock that the order can
   still transition to `OUT_FOR_DELIVERY` (`claimableOrder`), closing the same-order/different-agent
   race at its actual granularity.
4. Also fixed a related but separate bug found in the same pass: `DeliveryFeeStrategyFactory` had
   been sharing one static, mutable `SurgeDeliveryFeeStrategy` instance across all callers, letting
   any order's surge multiplier bleed into every other order's pricing in the same process.
5. Replaced three of the seven fabricated frontend fallbacks in `ZomatoPage.jsx` (fake OTP `1234`,
   fake agent name `Ramesh Kumar`) with honest placeholders, and explicitly logged the remaining
   four (lines ~1172, 1231, 1232, 1667) as not yet done rather than leaving them undocumented.
6. **This RCA's own contribution — closed the test-coverage gap the commit had flagged:** added
   `fiveOrdersRacingForOneAgentViaAssignAgent_onlyOneWins`,
   `disjointAssignAgentCallsAllSucceedWithDistinctAgents`, and
   `repeatedAssignAgentRaceNeverProducesTwoWinners` (300 rounds) to `ZomatoConcurrencyTest`, all
   calling `assignAgent(orderId)` — the path production and the sim engine actually use — instead
   of the already-covered `assign(orderId, agentId)`.
7. Finished the remaining fallback cleanup: `newOrder.deliveryOtp` and `realOrder?.deliveryOtp` no
   longer fall back to `'1234'` (both `placeOrder` and `simOrder` always populate `deliveryOtp`
   before returning the order, so the fallback could never legitimately fire). The two
   `deliveryAgentName || 'Ramesh Kumar'` fallbacks in `handleStep5Ready`, however, turned out to
   guard a value that genuinely *can* be absent — `markReadyForPickup`/`simReady` swallow
   `NoAgentAvailableException` internally and return the order unchanged when no agent is free,
   exactly mirroring the already-honest `updated.status === 'OUT_FOR_DELIVERY'` branch used
   elsewhere in the same file for the non-sim restaurant flow (`handleMarkReady`). Rather than
   inventing a new fake name, that call site was changed to branch on `updated.status` the same
   way, showing a genuine "no agent available yet" message instead of a fabricated assignment.
8. Verified the new tests actually detect the defect they claim to: commented out the
   `lock.lock()`/`lock.unlock()` pair inside `assignAgent`'s candidate loop, reran only the three
   new tests, and watched `repeatedAssignAgentRaceNeverProducesTwoWinners` fail —
   `Round 119 produced 2 winners instead of 1 via assignAgent ==> expected: <1> but was: <2>` —
   while the two single-shot tests happened to pass by luck in that run (the unguarded window is
   nanoseconds wide, same lesson as RCA-006 step 7). Restored the lock, confirmed via `git diff`
   that `DeliveryAssignmentService.java` was byte-identical to the committed version, and reran the
   full suite green.

### 6. Preventative Measures
1. **Compile before you commit "WIP."** `mvn -o -q compile` (or at minimum `test-compile`) is fast
   and would have caught the lambda-capture failure before it reached the branch at all; a branch
   that has never compiled cannot have run any of its 203 tests, which is a much larger blast
   radius than the one module being touched.
2. **One public constructor per `@Service`, or an explicit `@Autowired`.** Because `LldApplication`
   shares one `ApplicationContext` across all 30 modules, an ambiguous bean in any single module
   fails every module's context-dependent test, not just its own — `DomainExceptionContractTest`,
   `GlobalExceptionHandlerTest` and `ErrorContractIntegrationTest` exist precisely to catch
   cross-module fallout like this, and did.
3. **Lock at the granularity of the invariant you're protecting, not the resource that happens to
   be nearby.** "One agent serves one order" needed a lock on the *order* as much as the *agent* —
   protecting only the agent looked sufficient because the common case (two orders racing one
   agent) worked, but the actual bug was the mirror-image case (one order racing across two
   agents). `DeliveryAssignmentService`'s class javadoc now states the order-then-agent lock
   ordering explicitly so a future change never reverses it and reintroduces deadlock risk.
4. **A regression test must cover the code path production actually calls, not a sibling with the
   same name.** `assign(orderId, agentId)` and `assignAgent(orderId)` look almost interchangeable
   from the outside, but only `assignAgent` is reachable from `markReadyForPickup` and `simReady`.
   `ZomatoConcurrencyTest` now exercises both, and the pattern established in RCA-006 — assert an
   invariant, never a timing, and repeat the narrow-window case ~300 times with fresh state per
   round — was reused rather than re-derived, catching a race that a single run could easily miss
   (as it did for the two single-shot `assignAgent` tests in the verification run above).
5. **Never trust a concurrency test until you have watched it fail.** Every new test added here was
   verified against a deliberately broken implementation before being trusted against the fixed
   one, and the broken implementation was restored to a byte-identical `git diff` afterward so the
   experiment left no trace in the shipped code.
6. **A `|| 'fake value'` fallback is not automatically dishonest — check what the field actually
   guarantees before deciding.** Two of the four remaining fallbacks (`deliveryOtp`) were removable
   outright because the backend always populates that field before returning the order. The other
   two (`deliveryAgentName`) were not — the backend explicitly supports a "ready, but no agent yet"
   state — so the fix there was conditional rendering that tells the truth in both states, matching
   the pattern the same file already used for the equivalent non-sim flow, rather than another
   fabricated placeholder.

## RCA-008: Duplicate Spring Bean Name Across Modules Crashing the Whole ApplicationContext

**Severity:** High
**Date:** 2026-08-24
**Status:** Resolved
**Affected:** `com.lld.carrental` (new module), and transitively every module in the JAR — the
whole `ApplicationContext` fails to start, so this is not scoped to car-rental at all.

### 1. Overview & Severity
While building the car-rental module's tiered-pricing Strategy + Factory pair, a class named
`PricingStrategyFactory` was added under `com.lld.carrental.strategy`. `parkinglot` already has
an unrelated, differently-shaped class with the exact same simple name under
`com.lld.parkinglot.strategy`. Spring's default component-scan bean naming is the simple class
name decapitalized, not the fully-qualified name, so both classes registered as the bean id
`pricingStrategyFactory`. `ApplicationContext` startup — and therefore `mvn test` for every
module, not just car-rental — failed immediately. High severity because a single new file with
an innocuous name silently took down the entire portfolio's test suite and would have failed CI
across all 30 backend modules, not just the one being changed.

### 2. Symptoms & Error Logs
`mvn test -Dtest='com.lld.config.*Test'` (a suite that has nothing to do with car-rental) failed
with a Spring context-loading error on `ErrorContractIntegrationTest`, which is `@SpringBootTest`
and therefore boots the real `LldApplication`:

```
Caused by: org.springframework.beans.factory.BeanDefinitionStoreException: Failed to parse
configuration class [com.lld.LldApplication]
...
Caused by: org.springframework.context.annotation.ConflictingBeanDefinitionException:
Annotation-specified bean name 'pricingStrategyFactory' for bean class
[com.lld.parkinglot.strategy.PricingStrategyFactory] conflicts with existing, non-compatible
bean definition of same name and class [com.lld.carrental.strategy.PricingStrategyFactory]
```

The car-rental module itself compiled cleanly (`mvn -o -q compile` succeeded) — the failure only
surfaced at Spring context load, i.e. any test that does not boot a full `ApplicationContext`
(plain `new CarRentalService(...)` unit tests) would never have caught it.

### 3. Root Cause
Spring's `@Component`/`@Service`/`@Repository` component scan registers a bean under
`Introspector.decapitalize(simpleClassName)` when no explicit name is given —
`com.lld.parkinglot.strategy.PricingStrategyFactory` and `com.lld.carrental.strategy.
PricingStrategyFactory` both decapitalize to `pricingStrategyFactory`, and `scanBasePackages =
"com.lld"` in `LldApplication` scans both packages into the same registry. Two different classes
claiming the same bean id is a hard `ConflictingBeanDefinitionException` at context-refresh time,
not a silent shadow — but because it only fires when the *whole* context assembles, a test that
constructs the service by hand (as most of this repo's unit tests do) never exercises it.

### 4. Diagnostic Commands
```bash
# Find every other module's class with the same simple name before naming a new one
find backend/src/main/java/com/lld -name "PricingStrategyFactory.java"

# Confirm the collision precisely from the stack trace
mvn -o -q test -Dtest='com.lld.config.*Test' 2>&1 | grep -A2 "ConflictingBeanDefinitionException"
```

### 5. Step-by-Step Resolution
1. Ran the cross-cutting `com.lld.config.*Test` suite (which boots the real `ApplicationContext`
   via `ErrorContractIntegrationTest`) after adding the new module, per this repo's habit of
   running suites broader than just the new module's own tests.
2. Read the `ConflictingBeanDefinitionException` message, which names both fully-qualified
   classes and the colliding bean id directly — no further investigation needed.
3. Grepped every module for the same simple class name (`PricingStrategyFactory`,
   `PricingStrategy`, `PaymentProcessor`, `Payment`) to check for other latent collisions.
   `PricingStrategy` (an interface, not a bean) and `Payment` (plain model classes, not beans)
   collide by name but never register — no conflict. `PaymentProcessor` already had this exact
   problem solved in `uber` via an explicit qualifier (`@Component("uberPaymentProcessor")`),
   which `com.lld.carrental.payment.PaymentProcessor` had already copied
   (`@Component("carRentalPaymentProcessor")`) — so only `PricingStrategyFactory` needed a fix.
4. Gave `com.lld.carrental.strategy.PricingStrategyFactory` an explicit bean name,
   `@Component("carRentalPricingStrategyFactory")`, with a comment naming the colliding class —
   same fix shape as the existing `uber` precedent, no class rename needed.
5. Verified: `mvn -o -q test -Dtest='com.lld.config.*Test'` passed (`ErrorContractIntegrationTest`
   now boots the full context cleanly), then the full `mvn test` run stayed at the pre-existing
   pass count plus car-rental's new tests, with zero failures elsewhere.

### 6. Preventative Measures
- Any module adding a `@Component`/`@Service`/`@Repository` class should grep
  `backend/src/main/java/com/lld/*/**/ClassName.java` for the exact simple name across *all*
  modules before assuming it is unique — component scan is portfolio-wide (`scanBasePackages =
  "com.lld"`), so a name only needs to collide with any other module, not just siblings.
  `AGENTS.md`'s Car Rental section now calls this out explicitly.
- Prefer an explicit `@Component("<module>SomeName")` qualifier for any class whose simple name
  is a generic, likely-to-be-reused noun (`PricingStrategyFactory`, `PaymentProcessor`,
  `Validator`, `Notifier`) rather than relying on package uniqueness, which Spring's default bean
  naming does not honour.
- `ErrorContractIntegrationTest` (`@SpringBootTest`) is already the guard that catches this class
  of bug — it is the one cross-cutting test in the suite that boots the real, fully-scanned
  `ApplicationContext` rather than constructing a service by hand, and it is exactly what caught
  this. No module-specific test could have: the collision is inherently a cross-module property.
## RCA-009: A One-Time Bonus Strategy Re-Firing on Every Subsequent Vote

**Severity:** Medium
**Date:** 2026-08-24
**Status:** Resolved
**Affected:** `com.lld.stackoverflow.strategy.AcceptedAnswerReputationStrategy` (deleted),
`com.lld.stackoverflow.service.StackOverflowService.voteAnswer` (original, pre-rewrite)

### 1. Overview & Severity
`AcceptedAnswerReputationStrategy` modeled the one-time "answer got accepted" reputation bonus as
a per-vote `ReputationStrategy`, so the bonus was re-applied on *every* subsequent vote cast on an
already-accepted answer — including downvotes, which should have cost the author reputation
instead of gaining it. Medium severity: it never crashed or corrupted storage, but it silently
inflated reputation totals, which are the module's core scoring mechanism and are shown to users
directly. Caught while writing `VotingServiceTest` for the rewrite, before this behaviour ever
shipped to the live module's frontend.

### 2. Symptoms & Error Logs
No exception, no failing endpoint — the bug is arithmetic, not a crash, so nothing in the logs
flagged it. Working through the original `voteAnswer` by hand for an accepted answer exposes it:

```java
// backend/src/main/java/com/lld/stackoverflow/service/StackOverflowService.java @ 01d0828
ReputationStrategy strategy;
int bonus = 0;
if (a.isAccepted()) {
    strategy = new AcceptedAnswerReputationStrategy();
    bonus = strategy.calculateReputationChange(voteType);      // always 25, regardless of voteType
} else {
    strategy = new AnswerReputationStrategy();
}
int delta = strategy.calculateReputationChange(voteType) + bonus;   // 25 + 25 = 50 on an UPVOTE
```

```java
// AcceptedAnswerReputationStrategy.java @ 01d0828
public int calculateReputationChange(VoteType voteType) {
    return 25;   // ignores voteType entirely
}
```

For an accepted answer: an **upvote** awarded `25 (strategy) + 25 (bonus) = 50` reputation instead
of the intended one-time `+25`; a **downvote** — which should cost the author reputation — also
awarded a flat `+25`, because `calculateReputationChange` never inspected `voteType`. Voting on an
accepted answer ten times awarded 250–500 reputation for one answer, with no upper bound.

### 3. Root Cause
The strategy interface's contract is "reputation delta for one vote," a per-event calculation
meant to be invoked once per vote cast. The accepted-answer bonus is not a per-vote quantity — it
is a one-time state transition (`accepted: false -> true`) that should fire exactly once,
independent of how many votes the answer receives afterward. Wrapping that one-time event in the
same `ReputationStrategy` interface as the per-vote strategies collapsed two different kinds of
event into one call site, and the call site (`voteAnswer`) had no way to distinguish "this vote
is happening" from "this answer just became accepted." The bonus was recomputed and re-added on
every vote instead of on every acceptance.

### 4. Diagnostic Commands
```bash
# A "strategy" invoked from inside a vote handler that ignores its own vote-type parameter
# is the tell — the accepted-answer bonus has no business varying per UPVOTE/DOWNVOTE call.
grep -n "calculateReputationChange" backend/src/main/java/com/lld/stackoverflow/strategy/AcceptedAnswerReputationStrategy.java

# Confirm it fires on every vote, not just the acceptance itself
grep -n "isAccepted()" backend/src/main/java/com/lld/stackoverflow/service/StackOverflowService.java

# After the rewrite: prove the bonus now fires exactly once
mvn -o test -Dtest='VotingServiceTest#reacceptingSameAnswerDoesNotDoubleAward'
mvn -o test -Dtest='VotingServiceTest#votingOnAcceptedAnswerUsesNormalStrategy'
```

### 5. Step-by-Step Resolution
1. Deleted `AcceptedAnswerReputationStrategy` entirely — a one-time event has no business
   implementing a per-vote interface.
2. Kept the accepted-answer bonus as a plain constant, `VotingService.ACCEPTED_ANSWER_BONUS = 15`
   (retuned from the original 25 to sit between the question and answer upvote values), applied
   exactly once inside `acceptAnswer`, only on the transition from not-accepted to accepted —
   re-accepting the same answer, or accepting after it is already the accepted one, is a no-op.
3. Left voting on an accepted answer to go through the ordinary `AnswerReputationStrategy` — an
   upvote on an accepted answer now correctly awards `+10`, not `+25` and not `+50`, and a
   downvote correctly costs `-2` instead of awarding a flat bonus.
4. Wrote `VotingServiceTest#reacceptingSameAnswerDoesNotDoubleAward` (accept the same answer
   twice, assert the bonus landed once) and `#votingOnAcceptedAnswerUsesNormalStrategy` (accept,
   then upvote, assert the delta is exactly the normal `+10` and not `+15`, `+25` or `+50`) as the
   regression guard, then ran the full `VotingServiceTest` suite green (19/19).
5. Documented the distinction directly on `ReputationStrategy`'s javadoc — "the accepted-answer
   bonus is deliberately **not** part of this interface" — so a future strategy addition does not
   repeat the mistake of folding a one-time event into a per-vote calculation.

### 6. Preventative Measures
1. `VotingServiceTest#reacceptingSameAnswerDoesNotDoubleAward` and
   `#votingOnAcceptedAnswerUsesNormalStrategy` fail immediately if the bonus is ever folded back
   into a per-vote strategy or re-fires on a repeat accept.
2. `ReputationStrategy`'s javadoc states the rule directly at the extension point most likely to
   reintroduce it: anyone adding a new strategy reads why the bonus is not one.
3. `AGENTS.md`'s Stack Overflow section calls out the distinction between per-vote strategies and
   the one-time bonus constant, so an `/audit-lld` pass on this module has the fact in scope
   without re-deriving it from the code.
---

## RCA-010: Fresh Git Worktrees Start With Zero Installed Frontend Packages

**Severity:** Low
**Date:** 2026-08-24
**Status:** Resolved
**Affected:** `frontend/` in any `git worktree add`-created checkout (e.g.
`.claude/worktrees/agent-af4c7738782df187c`) — build/test tooling only, no application code.

### 1. Overview & Severity
Building the `concert-ticket` module in an isolated worktree, the first `npx vitest run` failed
before a single test file loaded. The error pointed at `vite.config.js` itself, which looked like a
config regression rather than what it actually was: the worktree simply had no `node_modules`
directory at all. Severity is Low — this costs a few minutes of misdirected debugging per fresh
worktree and self-resolves with one `npm install`, it is not a code defect and never reaches a
shipped build — but it is worth recording because the error message actively misleads toward the
wrong file.

### 2. Symptoms & Error Logs
```
$ npx vitest run
vite.config.js (1:492) [UNRESOLVED_IMPORT] Could not resolve 'vite' in vite.config.js
vite.config.js (2:18) [UNRESOLVED_IMPORT] Could not resolve '@vitejs/plugin-react' in vite.config.js
   import react from '@vitejs/plugin-react'
                      ─────────┬──────────
                                ╰──────────── Module not found, treating it as an external dependency

failed to load config from .../frontend/vite.config.js

⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite' imported from
  .../node_modules/.vite-temp/vite.config.js.timestamp-....mjs
```
Nothing here says "package not installed" — `ERR_MODULE_NOT_FOUND` against a `.vite-temp` shim and
two `[UNRESOLVED_IMPORT]` warnings on the two lines of `vite.config.js` read exactly like a broken
or version-mismatched config, not a missing `npm install`.

### 3. Root Cause
`node_modules` is gitignored, so it is not part of the tracked tree that `git worktree add`
materializes — a worktree only ever gets the files Git tracks. The main checkout at
`/mnt/c/Users/Hp/OneDrive/Desktop/lld-with-ui/frontend/node_modules` had packages installed from
earlier work, but that directory is local to *that* working tree; a second, sibling worktree
(`.claude/worktrees/agent-af4c7738782df187c`) is a fully independent checkout on disk and does not
share it — Git worktrees share the `.git` object database, never the ignored working-tree
directories. Every fresh worktree therefore starts with frontend tooling completely uninstalled
until `npm install` is run inside that specific worktree's `frontend/`.

### 4. Diagnostic Commands
```bash
# Confirm the failure is "nothing installed", not "something broken"
ls frontend/node_modules 2>&1                 # No such file or directory

# Confirm a sibling checkout does have it, proving this is per-worktree, not repo-wide
ls /mnt/c/Users/Hp/OneDrive/Desktop/lld-with-ui/frontend/node_modules | head -3
find .claude/worktrees -maxdepth 3 -iname node_modules -type d   # other worktrees, for comparison
```

### 5. Step-by-Step Resolution
1. Ran `npm install` inside this worktree's `frontend/` — added 106 packages in ~12s.
2. Reran `npx vitest run`: all 3 suites, 250 tests passed.
3. Reran `npm run build`: succeeded, entry chunk 260.62 kB (well under the 500 kB CI budget),
   `ConcertTicketPage` landed in its own 21.10 kB lazy chunk.
4. Verification: green `vitest` run plus a successful `vite build` prove the environment gap was
   the entire problem — no application or config code was touched to fix this.

### 6. Preventative Measures
- Documenting this here is itself the guard: the next agent hitting `ERR_MODULE_NOT_FOUND` /
  `[UNRESOLVED_IMPORT]` pointing at `vite.config.js` in a worktree now has a named incident to
  match against instead of re-diagnosing a "broken config" from scratch.
- No code or CI change is applicable — this is inherent to how `git worktree` and `.gitignore`
  interact, not a bug in this repository. The mitigation is procedural: run `npm install` (and,
  for the backend, let the first `mvn` invocation populate the local `~/.m2` cache) as the first
  step in any new worktree before trusting a red test run as a real regression.

---

## RCA-011: CricInfo's Per-Match Ball Lock Verified, and a Case-Only Filename Drift on the WSL Mount

**Severity:** Medium
**Date:** 2026-08-24
**Status:** Resolved
**Affected:** `com.lld.cricinfo.service.BallRecordingEngine`, `frontend/src/lld/cricinfo/CricInfoPage.jsx`

### 1. Overview & Severity
Two unrelated issues surfaced while building the CricInfo module's ball-by-ball Observer
pipeline. First, the per-match `ReentrantLock` in `BallRecordingEngine` — the lock that makes
"append this ball, then fold it into the live scorecard" atomic per match — needed to be
verified the way RCA-006 verifies Uber's per-driver lock: prove the concurrency test actually
fails without it, not just that it passes with it. Second, editing the pre-existing frontend
page on this repo's case-insensitive-but-case-preserving WSL mount silently renamed the
git-tracked `CricInfoPage.jsx` to `CricinfoPage.jsx` on disk, which would have built and tested
green locally while breaking on the case-sensitive Linux CI runner. Medium severity: the lock
gap would have shipped an invisible scoring-corruption bug, and the filename drift would have
failed CI with a confusing "module not found" rather than an obvious diff.

### 2. Symptoms & Error Logs
With the lock intentionally disabled and a 1ms sleep inserted between reading state and
appending the ball (to widen the race window), 100 concurrent single-run wides on one match
undercounted:

```
org.opentest4j.AssertionFailedError: lost or double-counted runs under concurrent recording
==> expected: <101> but was: <92>
```

Separately, after rewriting `CricInfoPage.jsx` in place, `git status` reported it as merely
**modified** (not renamed), and `ls -la` showed the on-disk entry as `CricinfoPage.jsx`
(lowercase `i`) while `git ls-files` still reported `CricInfoPage.jsx` — a silent divergence
between the git index and the physical directory entry that only a case-sensitive filesystem
would ever surface as an error.

### 3. Root Cause
**Lock:** none — this was a planned verification, not a discovered bug. `BallRecordingEngine`
already held a per-match `ReentrantLock` (looked up by `matchId`, `computeIfAbsent`-created) around
numbering the ball, appending it to `Innings.balls`, and synchronously publishing to every
`BallEventObserver`. Removing it exposed the same shape of race as RCA-006: `ScorecardProjectionObserver`
does a plain, unsynchronized `innings.setTotalRuns(innings.getTotalRuns() + ball.totalRuns())`
read-modify-write, and `innings.getBalls()` is a plain (non-thread-safe) `ArrayList`. Twenty
threads racing that line lose updates exactly like two threads racing `driver.setStatus(...)`
in RCA-006.

**Filename:** the repo lives on a Windows drive mounted into WSL (`/mnt/c/...`), which is
case-insensitive for path *lookups* but case-preserving for the *stored* directory entry. The
`Write` tool call used the path `.../cricinfo/CricinfoPage.jsx` (lowercase `i`) to edit a file
git had committed as `CricInfoPage.jsx`. The filesystem resolved the lookup to the same physical
file (case-insensitive), but the act of writing through the differently-cased path renamed the
stored directory entry to match the write path's casing — git's index was never told, because
from git's point of view the tracked path's *content* changed, not its name.

### 4. Diagnostic Commands
```bash
# Prove the lock is load-bearing: disable it, confirm a real failure, restore, confirm no diff
sed -n '48,133p' backend/src/main/java/com/lld/cricinfo/service/BallRecordingEngine.java
mvn -o test -Dtest='CricinfoConcurrencyTest#concurrentBalls_sameMatch_noLostOrDoubleCountedRuns'
git diff backend/src/main/java/com/lld/cricinfo/service/BallRecordingEngine.java   # must be empty after restore

# Detect a case-only filename drift on a case-insensitive mount
git ls-files | grep -i cricinfo          # what git thinks is tracked
ls -la frontend/src/lld/cricinfo/         # what's actually on disk
git status --short                       # a same-content, different-case file shows as "M", not "R"
```

### 5. Step-by-Step Resolution
1. **Lock verification**: commented out `lock.lock()`/`lock.unlock()` in `BallRecordingEngine.recordBall`
   and added a 1ms `Thread.sleep` between building the `Ball` and appending it, to reliably widen
   the unguarded window (mirroring RCA-006's lesson that the delay must sit *inside* the real gap,
   not before it). Ran the concurrency test — captured the corrupted total above (92 instead of 101).
   Restored the file from the last commit, confirmed `git diff` was byte-identical, and reran the
   full `CricinfoConcurrencyTest` class green.
2. **Filename drift**: force-corrected the on-disk casing with a two-step rename through a
   temporary name (`mv CricinfoPage.jsx CricInfoPage_tmp.jsx && mv CricInfoPage_tmp.jsx CricInfoPage.jsx`)
   — a single `mv CricinfoPage.jsx CricInfoPage.jsx` is a no-op on a case-insensitive filesystem
   and does not change the stored casing. Re-ran `npx vitest run` to confirm `routing.test.js`'s
   "every page file is reachable through some route" check (which globs the filesystem) matched
   the git-tracked name again.

### 6. Preventative Measures
1. `CricinfoConcurrencyTest#concurrentBalls_sameMatch_noLostOrDoubleCountedRuns` and
   `#disjointMatches_scoreIndependentlyUnderConcurrency` deliberately race **wides** rather than
   legal deliveries for the shared-match case — a wide never completes an over, so every racing
   thread can omit striker/bowler identity fields and hit the exact same code path, keeping the
   test itself simple enough that a failure can only mean the lock is missing, not a test bug.
2. When editing a pre-existing file on this repo (which several agents build on this same WSL
   mount concurrently), check `git ls-files | grep -i <name>` for the tracked casing before
   writing, not just `ls`, since `ls` after the edit will confirm whatever was just written rather
   than reveal the drift.
3. `routing.test.js`'s on-disk-glob-vs-registered-routes check is exactly the kind of guard that
   catches this class of drift before it reaches CI — it failed locally the moment the rename
   happened, which is what surfaced this incident in the first place.

## RCA-012: An Observer Registered in a Notifier Was Also Invoked Directly, Double-Firing Every Alert

**Severity:** Medium
**Date:** 2026-08-24
**Status:** Resolved
**Affected:** `com.lld.inventory.service.InventoryService.emitAlert` (fixed), every caller of `doUpdateStock`/`reorder`/`simReorder`

### 1. Overview & Severity
`InAppStockAlertObserver` was registered as one of `StockAlertNotifier`'s observers (constructor
injection for the live instance, explicit registration in `resetSandbox()` for the sim sandbox)
— but `InventoryService.emitAlert` also held a direct reference to it (`targetFeed`) and called
`targetFeed.onStockAlert(alert)` a second time, right after `targetNotifier.publish(alert)` had
already fanned the same alert out to every registered observer, `InAppStockAlertObserver`
included. Every stock alert was therefore appended to the in-app feed's deque twice. Medium
severity: no exception, no incorrect stock arithmetic — the bug is purely in the alert feed, which
`GET /api/inventory/alerts` and the frontend's alerts panel both read directly, so every low-stock,
out-of-stock, restock and reorder notification a user saw was duplicated. Caught while writing
`InventoryServiceTest`'s crossing-detection assertions, before this module had ever shipped a test
that actually counted the alerts it produced.

### 2. Symptoms & Error Logs
No exception — the bug is a count mismatch, not a crash:

```text
InventoryServiceTest.crossingBelowReorderLevel_firesLowStockOnce:125
  expected: <1> but was: <2>

InventoryServiceTest.alreadyBelowLevel_doesNotRefire:137
  LOW_STOCK must fire on the crossing only, not every sale below it ==> expected: <1> but was: <2>
```

A single `updateStock(id, 6, "OUTBOUND", "sale")` call that should cross a product below its
reorder level exactly once was producing two identical `LOW_STOCK` entries in
`inAppObserver.recentAlerts()`.

### 3. Root Cause
```java
// InventoryService.emitAlert @ pre-fix
targetNotifier.publish(alert);   // fans out to every registered observer
targetFeed.onStockAlert(alert);  // the queryable in-app feed
```
`targetNotifier` was constructed as `new StockAlertNotifier(List.of(inAppObserver, new
LoggingStockAlertObserver()))` — so `inAppObserver` was already one of the observers `publish()`
iterates. The second line was meant to look like "also update the queryable feed," but the
queryable feed *was* `targetFeed`/`inAppObserver`, the exact same object the fan-out had just
notified. `StockAlertNotifier.publish()` swallows any observer's `RuntimeException` (so a broken
observer can't break the others), which is why this produced a silent duplicate rather than any
kind of failure — there was nothing to throw.

### 4. Diagnostic Commands
```bash
# An observer both registered in a notifier's list AND held as a separate direct reference
# by the same caller is the tell — check whether the direct reference is itself one of the
# constructor-injected observers.
grep -n "new StockAlertNotifier(List.of(" backend/src/main/java/com/lld/inventory/service/InventoryService.java

# Confirm emitAlert calls the same observer twice
grep -n "targetNotifier.publish\|targetFeed.onStockAlert" backend/src/main/java/com/lld/inventory/service/InventoryService.java

# After the fix: prove each alert now fires exactly once
mvn -o test -Dtest='InventoryServiceTest#crossingBelowReorderLevel_firesLowStockOnce'
mvn -o test -Dtest='InventoryServiceTest#alreadyBelowLevel_doesNotRefire'
```

### 5. Step-by-Step Resolution
1. Removed the redundant `targetFeed.onStockAlert(alert)` call from `emitAlert` — `publish()`
   already reaches every registered observer, `InAppStockAlertObserver` included.
2. Removed the now-unused `targetFeed`/`InAppStockAlertObserver` parameter from `emitAlert` and
   from `doUpdateStock` (which only ever used it to forward into `emitAlert`), and updated all six
   call sites (`updateStock`, `transferStock`, `reorder`, `simSell`, `simRestock`, `simTransfer`,
   `simReorder`, `simRace`'s per-buyer call) to drop the argument — a genuinely-unused parameter
   left in place would have been the next person's excuse to reintroduce the direct call.
3. Documented the invariant directly on `emitAlert`'s javadoc: the in-app feed is *reached through*
   the notifier's observer list, not called separately, so a future alert sink must register with
   `StockAlertNotifier` rather than be invoked ad hoc from inside `emitAlert`.
4. Reran the full `InventoryServiceTest` suite: both previously-failing crossing-detection tests
   now pass, and the fix required no change to the tests themselves — they were correct; the
   production code was not.

### 6. Preventative Measures
1. `InventoryServiceTest#crossingBelowReorderLevel_firesLowStockOnce` and
   `#alreadyBelowLevel_doesNotRefire` assert the exact alert count for the module's three crossing
   transitions (`LOW_STOCK`, `OUT_OF_STOCK`, `RESTOCKED`) — a regression here fails immediately
   rather than silently doubling every alert again.
2. `emitAlert`'s javadoc states the rule at the exact line most likely to reintroduce it: the
   in-app feed is one of the notifier's observers, not a second delivery path.
3. General lesson for this repo's Observer-pattern modules (cricinfo, zomato's notification path):
   whenever a caller holds both a `Notifier`/`Publisher` reference and a direct reference to one
   of its own registered observers, check whether that direct reference is being invoked *outside*
   the publish/fan-out call — that duplication is easy to introduce by accident and, because
   `publish()` conventionally swallows observer exceptions, produces no error of any kind.

## RCA-013: H2OBonder's Barrier Action Mutated a Plain ArrayList While a Synchronized Reader Provided No Real Mutual Exclusion

**Severity:** Medium (caught in code review before any test ran against it — never reached a
committed or shipped state)
**Date:** 2026-08-25
**Status:** Resolved
**Affected:** `com.lld.concurrency.h2o.model.H2OBonder` (`bond()`, `currentOutputLength()`)

### 1. Overview & Severity
While designing `H2OBonder` — the `Semaphore`-bounded `CyclicBarrier(3)` primitive for the new
`h2o` concurrency module — the first draft had `bond()` (the barrier's action, which appends the
`"H"`, `"O"`, `"H"` tokens for one molecule to a plain `java.util.ArrayList<String> output`) as a
plain, unsynchronized `private void` method, while `currentOutputLength()` — called from
`hydrogen()`/`oxygen()` on every attempt/acquire/departure, including by threads belonging to a
*different, later* trio than the one currently inside `bond()` — was `synchronized`. A lock held on
only one side of a shared mutable field is not mutual exclusion: `currentOutputLength()`'s
`synchronized` gave a false sense of safety while `output.add(...)` inside `bond()` could still run
concurrently, unguarded, with a `synchronized` `output.size()` read from another thread. This is a
textbook Java Memory Model visibility hazard (no happens-before edge between the writer and the
reader) on top of `ArrayList` being explicitly documented as not thread-safe. Rated Medium rather
than High because it was caught by inspection while writing the class — before `H2OBonderTest` or
`H2OServiceTest` ever ran, so it never shipped, never had a chance to produce the flaky
CI-only-sometimes failure this category of bug is notorious for.

### 2. Symptoms & Error Logs
None observed directly — this was caught by re-reading the class immediately after writing it,
specifically by asking "which threads can call `bond()`'s writes and `currentOutputLength()`'s read
concurrently, and do they share a monitor?" JMM visibility races of this shape are the ones that are
hardest to catch from symptoms: an `ArrayList` growing its backing array while another thread reads
a stale `size` rarely throws (there is no bounds check tying the two together the way a torn
`ConcurrentModificationException` would), so a short-lived test run can pass every time by luck
while the production code remains genuinely racy. That gap between "no observed symptom" and
"actually correct" is exactly why the fix here is a code-level guarantee (same monitor on both
sides), not a test that happened to stay green.

### 3. Root Cause
```java
// H2OBonder, first draft
private void bond() {                       // NOT synchronized
    output.add("H");
    output.add("O");
    output.add("H");
    ...
}

private synchronized int currentOutputLength() {  // synchronized, but against nothing
    return output.size();
}
```
`bond()` runs on whichever thread completes a barrier trip (per `CyclicBarrier`'s contract, once
per trip, before any of that trip's 3 threads are released) — but a *different* trio's threads
(the next generation's H/O threads, already past their own `acquire()`, calling
`hydrogen()`/`oxygen()` → `recorder.record(...)` → `currentOutputLength()`) can run fully
concurrently with that `bond()` call, because permit availability for the next trio and the
in-progress `bond()` call are not otherwise ordered against each other. Synchronizing only the
reader means the reader always acquires the object's monitor, but the writer never does — so the
two can interleave their memory effects with no visibility guarantee whatsoever, the same class of
bug as reading a plain (non-`volatile`, non-synchronized) field from one thread while writing it
from another.

### 4. Diagnostic Commands
```bash
# The tell: one accessor of a shared mutable field is synchronized and the other is not.
grep -n "synchronized" backend/src/main/java/com/lld/concurrency/h2o/model/H2OBonder.java

# Confirm which threads can reach each accessor concurrently — bond() is the CyclicBarrier
# action; currentOutputLength() is called from hydrogen()/oxygen(), which run on every H/O
# thread including ones belonging to a not-yet-formed later trio.
grep -n "currentOutputLength\|barrier.await\|CyclicBarrier(3" backend/src/main/java/com/lld/concurrency/h2o/model/H2OBonder.java
```

### 5. Step-by-Step Resolution
1. Added `synchronized` to `bond()` as well, so it shares the exact same monitor
   (`this`) as `currentOutputLength()` — the two are now genuinely mutually exclusive, and the
   `output.add(...)` writes happen-before any subsequent `currentOutputLength()` read observes
   them.
2. Documented the invariant directly on `bond()`'s javadoc: it is synchronized on the same monitor
   as `currentOutputLength()` specifically so a concurrent trace read from a future trio's thread
   can never observe a torn (partially-appended) output list.
3. Verified the reasoning by temporarily reverting `bond()` to unsynchronized and re-reading the
   happens-before chain: with the revert, nothing in the JLS guarantees a thread calling
   `currentOutputLength()` ever observes `bond()`'s writes promptly or completely — confirming the
   fix is required by the memory model itself, not merely defensive.
4. `H2OBonderTest`'s 50-iteration stress race (20 molecules — 40 H + 20 O threads — per iteration,
   shuffled start order) and `H2OServiceTest`'s 25-iteration stress run both exercise exactly the
   concurrent-access pattern the fix protects, asserting the full sliding-window "never 3 of the
   same atom adjacent" invariant on every run.

### 6. Preventative Measures
1. `bond()`'s javadoc states the rule at the exact line most likely to regress it: synchronized on
   the same monitor as `currentOutputLength()`, and why.
2. General lesson for every module in this repo using a shared mutable collection guarded by
   `synchronized`/a lock: grep every accessor of that field and confirm *all* of them — not just
   the ones that "look like reads" — take the same monitor. A `CyclicBarrier`/`Semaphore` action
   callback is easy to mentally file as "runs alone" because the barrier itself is thread-safe;
   that thread-safety does not extend to plain fields the callback happens to touch.
3. When a synchronization bug is JMM-visibility-shaped rather than crash-shaped, do not wait for a
   test to turn red as the signal it's fixed — a short-lived JVM run frequently will not reproduce
   a visibility hazard at all. Prefer the code-level argument ("do all accessors share a monitor?")
   as primary evidence, with the stress tests as corroboration, not proof.

## RCA-014: Snake and Ladders createGame Had No Player Count Validation and Crashed With an Unhandled 500 Past 4 Players

**Severity:** Medium (a real unhandled-500 path, but only reachable by a caller deliberately or
accidentally sending 5+ player names; no legitimate 2-4 player flow ever hit it)
**Date:** 2026-08-25
**Status:** Resolved
**Affected:** `com.lld.snakeladders.service.SnakeLaddersService#createGame`,
`com.lld.snakeladders.model.Game` constructor

### 1. Overview & Severity
While building out the snakeladders module's first-ever test suite (it shipped with zero tests
across its entire history), writing a boundary test for `createGame` — "what happens with 5
players?" — turned up a genuine, previously-undetected defect: the service never validated player
count against anything. `Game`'s constructor assigns each player a token color from a fixed
4-entry `COLORS` list (`List.of("#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4")`) via
`colors.subList(0, playerNames.size())`. With 5 player names, `subList(0, 5)` on a 4-element list
throws `IndexOutOfBoundsException` — an exception this repo's `GlobalExceptionHandler` does not
special-case, so it fell through to Spring's default error resolver as a bare `500` with the
message stripped, exactly the failure mode `GlobalExceptionHandler`'s javadoc was written to
prevent for every *other* module already migrated to typed exceptions.

### 2. Symptoms & Error Logs
No user-facing bug report exists for this one — it was caught by a new test, not in production
use, because the frontend's setup form only ever offers 2-4 player slots. The failure this closes
would have looked like:
```
POST /api/snakeladders/games  { "players": ["A","B","C","D","E"] }
→ HTTP 500 Internal Server Error
  { "timestamp": "...", "status": 500, "error": "Internal Server Error", "path": "/api/snakeladders/games" }
```
with the actual cause (`IndexOutOfBoundsException: toIndex = 5` from `List.subList`) never
reaching the response body at all.

### 3. Root Cause
```java
// SnakeLaddersService, before this fix
public Game createGame(List<String> playerNames) {
    List<String> colors = List.of("#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4");
    String id = repository.generateId();
    Game game = new Game(id, playerNames, colors.subList(0, playerNames.size()), // <- no bound check
            DEFAULT_SNAKES, DEFAULT_LADDERS);
    ...
}
```
Nothing between the controller and `List.subList` ever asked "is `playerNames.size()` a number
this module can actually support?" A count of 0 or 1 is a different, quieter failure (a game with
no meaningful turn order, or `Game`'s constructor happily building a 1-player "game" that can
never finish sensibly) that also went unchecked. Both are the same missing-validation root cause:
the method trusted its input completely.

### 4. Diagnostic Commands
```bash
# Reproduce directly against the service, no HTTP layer needed:
cd backend && mvn -o -q test -Dtest='com.lld.snakeladders.SnakeLaddersServiceTest#createGameRejectsTooManyPlayers'

# Confirm GlobalExceptionHandler has no IndexOutOfBoundsException handler — this is *why* the
# failure surfaced as a bare 500 instead of a typed 4xx:
grep -n "@ExceptionHandler" backend/src/main/java/com/lld/config/GlobalExceptionHandler.java
```

### 5. Step-by-Step Resolution
1. Added `SnakeLaddersService#validatePlayerCount`, called at the top of `createGame`, enforcing
   `2 <= playerNames.size() <= 4` (2 is the minimum for a meaningful turn order; 4 is the ceiling
   the token-color palette actually supports).
2. Added a new typed exception, `InvalidPlayerCountException` (`@ResponseStatus(400)`), extending
   the module's new abstract `SnakeLaddersException` base — so an invalid count now returns a
   clean `400` with a real message instead of an opaque `500`.
3. Added `SnakeLaddersServiceTest#createGameRejectsTooFewPlayers` and
   `#createGameRejectsTooManyPlayers`, covering 0, 1, and 5 players, plus
   `#createGameAcceptsValidPlayerCounts` covering exactly 2, 3, and 4 — the full boundary.

### 6. Preventative Measures
1. `validatePlayerCount`'s exception message states the supported range explicitly (`"needs
   between 2 and 4 players, got: N"`), so the *next* time someone reads this code they see the
   constraint enforced at the boundary rather than having to infer it from `COLORS.size()`.
2. General lesson reinforced by this module's zero-test history: any collection indexed by
   caller-supplied size (`subList`, `get(n)`, array indexing) needs its bound validated at the
   entry point BEFORE that indexing operation runs, not discovered by whichever exception the JDK
   happens to throw. `GlobalExceptionHandler` deliberately does not catch every `RuntimeException`
   (see its own javadoc) specifically so that gaps like this one stay visible as bare 500s in
   testing, rather than being silently smoothed over into a misleadingly generic 400.
3. A module with zero tests has zero evidence its input handling is correct — this bug existed,
   unnoticed, for the module's entire history before this PR's first test suite found it on the
   first boundary case anyone thought to write.

## RCA-015: Minesweeper's Mine Placement Loop Could Spin Forever on an Unvalidated Mine Count

**Severity:** High (an unbounded CPU-spinning hang on the request-handling thread from a single
malformed request — the most severe class of bug in this batch, since it is a live availability
issue, not merely a wrong-status-code issue)
**Date:** 2026-08-25
**Status:** Resolved
**Affected:** `com.lld.minesweeper.service.MinesweeperService#placeMines` (pre-refactor),
now `com.lld.minesweeper.strategy.RandomMinePlacer#place`

### 1. Overview & Severity
Minesweeper, like snakeladders, shipped with zero tests across its entire history. Writing the
first board-config validation test — "what happens if `mines >= rows * cols`?" — surfaced a
genuine hang, not just a wrong status code. The original mine-placement loop was:
```java
while (placed < game.getTotalMines()) {
    int r = random.nextInt(rows);
    int c = random.nextInt(cols);
    if (!board[r][c].isMine()) {
        board[r][c].setMine(true);
        placed++;
    }
}
```
If `totalMines >= rows * cols`, this loop can place at most `rows * cols` mines — every cell
becomes a mine — after which `placed` permanently equals `rows * cols < totalMines`, and every
subsequent iteration picks an already-mined cell, does nothing, and loops again. The condition
`placed < totalMines` can never become false. This is not a slow operation; it is an infinite
loop that pins one CPU core at 100% forever, on the thread handling that one HTTP request, for a
single `POST /api/minesweeper/games` with a bad `mines` value.

### 2. Symptoms & Error Logs
No production incident — caught by a boundary test before this code ever shipped. Manually, the
symptom would have been: a `POST` request that simply never returns, no exception, no log line,
no timeout (Spring Boot's embedded Tomcat has no default read/write timeout that would abort a
handler thread stuck in a pure CPU loop with no I/O), and the JVM slowly losing worker threads to
this loop under repeated bad requests until the whole server stops responding to anyone.

### 3. Root Cause
The method trusted `totalMines` completely — there was no relationship enforced between
`totalMines` and `rows * cols` before the placement loop ran. A `while (condition-that-depends-
on-random-search-space)` loop is only safe when the search space is provably large enough that
the condition can be satisfied; nothing here proved that.

### 4. Diagnostic Commands
```bash
# Reproduce and prove termination under a hard timeout (this is exactly what the regression
# test below does — without the fix, this test itself would hang past its @Timeout and fail):
cd backend && mvn -o -q test -Dtest='com.lld.minesweeper.MinesweeperServiceTest#rejectsMineCountAtOrAboveCellCount'

# The loop shape that hangs — note no upper bound relating totalMines to rows*cols anywhere
# above it in the original service:
git show HEAD~1:backend/src/main/java/com/lld/minesweeper/service/MinesweeperService.java | sed -n '/private void placeMines/,/^    }/p'
```

### 5. Step-by-Step Resolution
1. Added `MinesweeperService#validateBoardConfig`, called at the top of `createGame`, enforcing
   `rows > 0`, `cols > 0`, `mines >= 0`, and — the one that actually closes this bug —
   `mines < rows * cols`, so at least one non-mine cell is always mathematically guaranteed to
   exist before mine placement ever begins.
2. Added `InvalidBoardConfigException` (`@ResponseStatus(400)`) so a rejected config is a clean,
   typed `400` instead of the request thread hanging with no response at all.
3. While in the area, extracted mine placement into an injectable `MinePlacer` strategy
   (`RandomMinePlacer`) specifically so a test could exercise the placement loop's boundary
   directly and deterministically (see RCA context in the module's design doc) rather than relying
   on random timing to occasionally reproduce a hang.
4. Added `MinesweeperServiceTest#rejectsMineCountAtOrAboveCellCount`, wrapped in a JUnit
   `@Timeout(value = 2, unit = SECONDS)` specifically so that if this validation were ever removed
   or weakened in the future, the test suite would hang and fail loudly (a timeout) rather than
   silently pass on a request that happened to return an error for an unrelated reason.

### 6. Preventative Measures
1. `InvalidBoardConfigException`'s message spells out *why* the bound exists ("so at least one
   cell — the first click — can always be safe"), tying the validation to the first-click-safe
   policy it also protects, not just to the hang.
2. General lesson: any `while (condition)` loop whose condition depends on a randomized search
   over a finite space needs the space's sufficiency proven *before* the loop starts, with a test
   that pins the exact boundary (here: `mines == rows*cols`, one past the last valid value) under
   a hard timeout — a plain `assertThrows` alone would not have caught a regression that turned
   this back into a hang, since a hung test and a slow-but-eventually-passing test look identical
   without an explicit timeout.
3. Same root lesson as RCA-014: a module with zero tests has zero evidence its input handling is
   correct. Two of this module's four typed exceptions (`InvalidBoardConfigException` here,
   `InvalidCellException` in RCA-016) exist because writing the *first* tests for previously
   untested code is exactly when input-validation gaps like this one get found.

## RCA-016: Minesweeper's Reveal and Flag Endpoints Skipped Bounds Checking and Threw an Unhandled 500

**Severity:** Medium (a real unhandled-500 path on a straightforward out-of-range request; no
data corruption or availability impact, unlike RCA-015)
**Date:** 2026-08-25
**Status:** Resolved
**Affected:** `com.lld.minesweeper.service.MinesweeperService#revealCell`,
`#flagCell` (pre-refactor)

### 1. Overview & Severity
Found alongside RCA-015 while writing this module's first-ever bounds tests. Neither `revealCell`
nor `flagCell` validated `row`/`col` against the board's actual dimensions before indexing into
it:
```java
// before this fix
Cell cell = game.getBoard()[row][col]; // row/col are raw caller input, unchecked
```
A `row` or `col` outside `[0, rows)` / `[0, cols)` — including a negative value, or a value at or
past the configured board size — threw a bare `ArrayIndexOutOfBoundsException`. Like RCA-014,
this exception type is not one `GlobalExceptionHandler` special-cases, so it surfaced as an
unhandled `500` with the message stripped, not the typed `4xx` every other reference module in
this repo returns for bad input.

### 2. Symptoms & Error Logs
No production incident — caught by a new boundary test. The failure this closes:
```
POST /api/minesweeper/games/1/reveal  { "row": -1, "col": 0 }
→ HTTP 500 Internal Server Error
  (actual cause: ArrayIndexOutOfBoundsException: Index -1 out of bounds for length 9 — never
   reaches the response body)
```

### 3. Root Cause
Both methods went straight from "look up the game" to "index the board" with no validation step
in between — the same missing-boundary-check shape as RCA-014 and RCA-015, in a third location in
the same module. All three exist because the module had never had a test written against it that
tried an invalid input; every one of its methods was written and merged against only the
happy-path frontend, which never sends an out-of-range coordinate because the UI only ever emits
clicks from within the rendered grid.

### 4. Diagnostic Commands
```bash
cd backend && mvn -o -q test -Dtest='com.lld.minesweeper.MinesweeperServiceTest#outOfBoundsCellThrows'

# Confirm the pre-fix code path: both reveal and flag indexed the board with no guard.
git show HEAD~1:backend/src/main/java/com/lld/minesweeper/service/MinesweeperService.java | grep -n "game.getBoard()\[row\]\[col\]"
```

### 5. Step-by-Step Resolution
1. Added `MinesweeperService#requireInBounds(game, row, col)`, called at the top of both
   `revealCell`'s and `flagCell`'s (shared) `applyReveal`/`applyFlag` implementations, before any
   board access.
2. Added `InvalidCellException` (`@ResponseStatus(400)`), extending the module's new abstract
   `MinesweeperException` base.
3. Added `MinesweeperServiceTest#outOfBoundsCellThrows`, covering a negative row, a row at exactly
   the board's row count (the classic off-by-one), a column past the board's column count, and a
   wildly out-of-range value on both reveal and flag.

### 6. Preventative Measures
1. Both `revealCell` and `flagCell` now funnel through the same `requireInBounds` check — a
   single choke point rather than two independent (and, as this incident showed, independently
   incomplete) validation sites.
2. General lesson, the same one as RCA-014 and RCA-015: this repo's `GlobalExceptionHandler` is
   deliberately narrow (`DomainException`, `IllegalArgumentException`/`IllegalStateException`,
   `NoSuchElementException` only — see its own javadoc) specifically so that an uncaught exception
   type surfaces as a loud, ugly `500` in testing rather than being silently absorbed into a
   generic `400` that would have hidden the fact that no validation existed at all. Three
   findings in one module in one afternoon of writing its first tests is a strong signal to check
   every other array/list index derived from raw request input across the rest of the portfolio,
   not just this module.
3. Reinforces the standing repo-wide rule this PR's task description called out explicitly: a
   module with zero test coverage has zero verified correctness, no matter how long it has been
   running without a reported incident — reported incidents require someone to have tried the
   input that breaks it.

## RCA-017: Digital Wallet's Repository Returned Wallets in Unspecified ConcurrentHashMap Iteration Order

**Severity:** Medium (silent nondeterminism, not a crash — but it left the order of `GET
/api/wallet` and the new `/sim/*` snapshot unspecified across calls and JVM runs, and specifically
undermined the new isolated simulation engine's assumption that the first two wallets in that list
are consistently the same two actors)
**Date:** 2026-08-25
**Status:** Resolved
**Affected:** `com.lld.digitalwallet.repository.WalletRepository#getAllWallets` (before fix)

### 1. Overview & Severity
While building the digitalwallet module's 8-step interactive simulation tab, the frontend
(`frontend/src/lld/digitalwallet/DigitalWalletPage.jsx`) needed two stable "actors" to walk
through credit/debit/transfer/race steps against, and picked them positionally off the `/sim/*`
snapshot's wallet list: `wallets[0]` and `wallets[1]`. That snapshot's wallet list came straight
from `WalletRepository#getAllWallets`, which returned `new ArrayList<>(wallets.values())` over a
`ConcurrentHashMap<Long, Wallet>`. `ConcurrentHashMap` makes no ordering guarantee whatsoever —
unlike `LinkedHashMap`, its iteration order is a function of each key's hash bucket placement, not
insertion order, and is not required to stay stable across a resize or across JVM runs. Severity
is Medium rather than High because nothing crashed and no data was corrupted — the three seeded
wallets (small `Long` keys 1, 2, 3) happen to hash into ascending bucket order in the current JDK,
so this had been silently "working" by implementation accident the entire time the module only had
a plain CRUD API with no code that depended on positional order.

### 2. Symptoms & Error Logs
None observed in this repo — no test or manual run had ever exercised list order before this PR,
because nothing previously depended on it. The failure mode this would produce, had the accidental
ordering ever flipped (e.g. after enough wallet creation/deletion churn changed the map's bucket
layout, or under a different JDK's `ConcurrentHashMap` hash spread), is entirely silent: the sim
walkthrough would keep working with no exception and no wrong-looking output — it would simply
walk "Bob" through the steps the UI narrates as "Alice", and `GET /api/wallet` would list wallets
in a different order on one server restart than another, with nothing in a response body signaling
that anything had changed.

### 3. Root Cause
`WalletRepository`'s backing store is a `ConcurrentHashMap<Long, Wallet>`, chosen (correctly) for
thread-safe concurrent access, not for ordering. Its `values()` view — and therefore anything built
from it, like the original `getAllWallets()` — carries no ordering contract at all. The repository
seeds wallets 1/2/3 as Alice/Bob/Charlie in the constructor, so it was easy to assume — wrongly —
that "seeded first" meant "returned first"; that assumption is true only as an accident of how the
JDK's current `ConcurrentHashMap` happens to place small, densely-packed `Long` keys into buckets,
not as anything the collection promises.

### 4. Diagnostic Commands
```bash
# The collection's own contract — ConcurrentHashMap.values()'s javadoc makes no ordering
# guarantee (contrast with LinkedHashMap, which explicitly documents insertion order):
grep -n "class WalletRepository" -A5 backend/src/main/java/com/lld/digitalwallet/repository/WalletRepository.java

# Where the assumption was introduced — the new sim frontend reading the snapshot positionally:
grep -n "walletA\|walletB\|wallets\[0\]\|wallets\[1\]" frontend/src/lld/digitalwallet/DigitalWalletPage.jsx

# The repository method that had no ordering guarantee before the fix:
git show HEAD~1:backend/src/main/java/com/lld/digitalwallet/repository/WalletRepository.java \
  | sed -n '/public List<Wallet> getAllWallets/,/^    }/p'
```

### 5. Step-by-Step Resolution
1. Changed `WalletRepository#getAllWallets` to explicitly sort the copied list by id —
   `all.sort(Comparator.comparingLong(Wallet::getId))` — before returning it, so both the live
   `GET /api/wallet` endpoint and the `/sim/*` snapshot now return wallets in a deterministic,
   documented order (ascending wallet id) instead of whatever order the map's buckets happen to
   iterate in.
2. Documented the guarantee directly on the method (`// Sorted by id — the frontend (and several
   tests) rely on a stable, deterministic wallet order.`), so the ordering is now a stated contract
   rather than an accident a future change could quietly break again.
3. Verified via `WalletRepositoryTest#seedsDemoData`, which asserts `findWalletById(1L)` is Alice
   with the exact seeded balance, and via the sim engine's own `WalletServiceTest#simResetSeedsSandbox`
   and the `WalletConcurrencyTest` suite, all of which now depend on (and would fail under) a stable
   ordering rather than merely tolerating one.

### 6. Preventative Measures
1. Never rely on `HashMap`/`ConcurrentHashMap` iteration order implicitly, even when it appears
   stable in ad-hoc testing — sort explicitly at the read boundary whenever a caller (API consumer,
   frontend, another test) needs a stable order, so the collection's internal choice (made for
   thread-safety) and the API's implied contract (ordering) cannot silently diverge again.
2. This class of bug is specifically easy to miss because small maps often "accidentally" iterate
   in insertion order for a given JDK and key distribution, so it will not reproduce under casual
   manual testing or even most automated tests unless the test explicitly asserts on order — the
   real guard is recognizing the collection's actual contract during review, not empirical testing.
3. `WalletRepositoryTest` and `WalletServiceTest`'s sandbox-seeding assertions now pin the exact
   ascending-id order as a regression guard, and the digitalwallet sim frontend's `wallets[0]`/
   `wallets[1]` usage is exactly the kind of positional dependency that would silently break again
   if this ordering guarantee were ever removed.

## RCA-018: Traffic Signal's Production Ticker Flooded Stdout Indefinitely at Default Log Level

**Severity:** Medium (no data corruption, but an unbounded, un-silenceable log flood on every run
of the backend — degrades local dev experience and would fill disk/log-aggregation quotas in any
longer-lived deployment)
**Date:** 2026-08-25
**Status:** Resolved
**Affected:** `com.lld.trafficsignal.observer.LoggingSignalObserver`

### 1. Overview & Severity
Reported directly by the user, who was seeing a continuous stream of
`[trafficsignal] intersection=... light=... (...) X -> Y` lines in their terminal with no way to
stop it short of killing the backend process.

### 2. Symptoms & Error Logs
```
[trafficsignal] intersection=2 light=0 (North) YELLOW -> RED
[trafficsignal] intersection=2 light=1 (South) RED -> GREEN
[trafficsignal] intersection=1 light=1 (South) YELLOW -> RED
...(repeats indefinitely, several lines per second, for as long as the process runs)
```

### 3. Root Cause
Two independently-reasonable pieces of design combined into a bug neither one is individually
guilty of:
- `TrafficSignalService` wires every real intersection (the eagerly-created main one, plus every
  intersection `TrafficSignalInitializer`/`createIntersection` adds) to a
  `ScheduledExecutorSignalTicker` that fires every second **for the lifetime of the process** —
  correct behavior for a live traffic signal demo.
- `LoggingSignalObserver`, registered on every such intersection's notifier, wrote every phase
  change straight to `System.out.printf` — "demonstrates a sink with no in-memory state," per its
  own docstring, which is true but says nothing about volume.

Two intersections seeded at boot (`Broadway & 5th Ave` plus the service's own eager one), four
lights each, ticking every second, transitioning through GREEN→YELLOW→RED→GREEN forever,
each transition printed unconditionally to stdout: the flood is not a malfunction, it is the
intended Observer behavior running at its intended cadence with no volume control on its sink.

### 4. Diagnostic Commands
```bash
# Confirm the ticker never stops once started
grep -n "scheduleAtFixedRate" backend/src/main/java/com/lld/trafficsignal/clock/ScheduledExecutorSignalTicker.java

# Confirm the sink had no log level / throttling
grep -n "System.out" backend/src/main/java/com/lld/trafficsignal/observer/LoggingSignalObserver.java

# Confirm two intersections are seeded at boot (the two IDs seen flooding)
grep -n "createIntersection\|new TrafficSignalService" backend/src/main/java/com/lld/trafficsignal/config/TrafficSignalInitializer.java backend/src/main/java/com/lld/trafficsignal/service/TrafficSignalService.java
```

### 5. Step-by-Step Resolution
1. Replaced `System.out.printf` in `LoggingSignalObserver` with an SLF4J `Logger` call at
   `DEBUG` level — Spring Boot's default logging configuration is `INFO`, so the observer now
   demonstrates the Observer pattern exactly as before (`logging.level.com.lld.trafficsignal=DEBUG`
   makes every transition visible again) without emitting anything at default settings.
2. Verified `backend/src/test/java/com/lld/trafficsignal/**` has no test asserting on captured
   `System.out`/`ByteArrayOutputStream` output, so the change carries no test-behavior risk.
3. Ran `mvn test -Dtest='com.lld.trafficsignal.**'` — green.

### 6. Preventative Measures
1. General rule for this repo going forward: any `Logger`/print statement wired to a component
   that runs on an unbounded, always-on scheduler (a production ticker, not a request handler)
   defaults to `DEBUG` or lower, never `INFO`+, unless the emission is genuinely rare (state
   transitions that happen a handful of times per session, not every tick).
2. `System.out`/`System.err` should not appear in `backend/src/main/java/**` at all — an SLF4J
   `Logger` is free to route to any level or sink and is the only idiomatic choice in a Spring
   Boot service; this was the one remaining `System.out` call introduced during the trafficsignal
   build-out and is now gone.
3. This module's `/sim/*` engine already isolates the interactive demo's event log from the real
   intersections precisely so demo activity can't corrupt production state — this incident is the
   mirror-image lesson: the real intersections' own observability needs the same volume discipline
   the sim path already has.

## RCA-019: Editing a Source File While Its Background `mvn compile` Was Still Running Produced Stale `.class` Files

**Severity:** Low (self-diagnosed and self-resolved during development; never reached a merged
build or a shipped test)
**Date:** 2026-08-25
**Status:** Resolved
**Affected:** `backend/` build process in this specific shared, multi-agent WSL environment —
tooling/workflow only, no application code.

### 1. Overview & Severity
While building out the auction module, a plain `mvn -o -q compile` was kicked off in the
background because this environment was unusually slow — several other agent sessions were
compiling their own worktrees on the same shared host at the same time, and a single `compile`
took over ten minutes of wall-clock time instead of the usual well-under-a-minute. While that
compile was still in flight, `AuctionInitializer.java` was edited to add a fourth seeded auction
(`seedAuctions` went from 3 items to 4). After the background compile reported success and the new
`AuctionRepositoryTest`/`AuctionServiceTest` suites were run, two assertions failed with
`expected: <4> but was: <3>` — even though `cat`-ing the source file on disk clearly showed four
`repo.saveAuction(...)` calls. Severity is Low because it cost a few minutes of confusion and
resolved itself with one full rebuild, but it is worth recording because the mismatch between "the
source file plainly says 4" and "the test says 3" looks exactly like a real logic bug, not a stale
build artifact.

### 2. Symptoms & Error Logs
```
[ERROR] AuctionRepositoryTest.initializerSeedsAuctionsAcrossLifecycleStates:152
        expected: <4> but was: <3>
[ERROR] AuctionServiceTest.simReset_freshSandbox:330
        expected: <4> but was: <3>
```
`grep -n "itemName(" AuctionInitializer.java` at the same moment showed all four items ("Vintage
Guitar", "Antique Pocket Watch", "Rare Stamp Collection", "Antique Clock") present in the file —
the disk content and the test failure directly contradicted each other.

### 3. Root Cause
A bare `mvn compile` (no `clean`) determines which sources need recompiling and reads their
content at the moment its compile goal actually executes for that file — not at the moment the
`mvn` command was invoked. On a fast machine that window is milliseconds, so an edit made "during"
the build is, in practice, always either fully before or fully after it. Here the build legitimately
took 10+ minutes end to end (slow cross-drive WSL I/O plus CPU contention from multiple concurrent
`mvn`/`java` processes launched by other parallel agent worktrees on the same host — confirmed via
`ps aux` showing 3-4 simultaneous `org.codehaus.plexus.classworlds.launcher.Launcher` processes),
which made that window wide enough for a mid-flight edit to land in an indeterminate spot relative
to javac's read of that specific file: the resulting `target/classes/.../AuctionInitializer.class`
reflected the pre-edit, 3-auction version even though the `.java` source on disk already had the
post-edit, 4-auction version.

### 4. Diagnostic Commands
```bash
# The smoking gun: source says 4, but the failure says 3 — check what's actually on disk right now.
grep -c "repo.saveAuction" backend/src/main/java/com/lld/auction/config/AuctionInitializer.java

# Force a clean, unambiguous rebuild and compare.
cd backend && mvn -o -q clean compile
mvn -o -q test -Dtest='com.lld.auction.*Test'
```

### 5. Step-by-Step Resolution
1. Confirmed the source file already had the intended 4-auction seed (`grep` above) — ruled out
   "the edit never saved."
2. Ran `mvn -o -q clean compile` (not a bare `compile`) to force every `.class` file to be
   regenerated from the current source tree rather than trusting the incremental up-to-date check.
3. Re-ran `mvn -o -q test -Dtest='com.lld.auction.*Test'` — both previously-failing assertions
   passed with no code change to the test or the initializer.
4. Ran the full backend suite afterward to confirm nothing else was affected by the same staleness.

### 6. Preventative Measures
1. Treat a source file as off-limits for edits while a background `mvn compile`/`mvn test` for
   that same module tree is still running — wait for the completion notification first, then edit,
   then (re)compile.
2. If an edit during an in-flight background build is unavoidable, always follow up with
   `mvn clean compile` (not a bare `compile`) before trusting the next test run's result — `clean`
   removes the ambiguity of "did javac see the old or the new content" entirely.
3. In an environment already known to be slow or shared with other concurrent agent sessions (see
   RCA-010 for the sibling worktree/`node_modules` version of this class of gotcha), prefer
   running one full `mvn -o -q compile` (or `test`) to completion, in the foreground or awaited via
   its background-task notification, before making further source edits — rather than treating a
   long-running build as a safe window for parallel work on the same files.

## RCA-020: Ludo's Home-Entry Roll Could Overshoot the Final Cell and Wrap the Token Around the Board Again

**Severity:** Medium (silently violates a core rule of the game — "exact count to finish" — for
every game that reaches the endgame; never crashes, so it shipped invisibly until this module's
first-ever tests exercised the endgame path)
**Date:** 2026-08-26
**Status:** Resolved
**Affected:** `com.lld.ludo.service.LudoService#moveToken` (now `#moveOnTrack`)

### 1. Overview & Severity
While building out ludo's first-ever test suite (it shipped with zero tests across its entire
history, the same starting state minesweeper and snakeladders had before RCA-014/015/016),
writing the "a token needs the exact roll to enter home" test turned up a genuine defect: the
service never checked whether a roll would carry a token past its home cell before applying it.
`newPos = (token.getPosition() + dice) % Game.TRACK_SIZE` computes a valid track cell for *any*
dice value 1-6, including one that lands past the token's own home cell and wraps it around into
another lap. Ludo's "exact count" rule — well known to anyone who has played the board game — was
simply never enforced; the only outcome the old code recognized as "finished" was landing *exactly*
on the home cell (`checkFinished`'s `token.getPosition() == endPos` check), so an overshoot did not
crash or corrupt state, it just silently returned the token to circling the main track indefinitely,
which is a real, observable rule violation a player would notice immediately.

### 2. Symptoms & Error Logs
No production bug report — caught by the first test written against the endgame path. The failure
this closes would have looked like:
```
// Player 0's home cell is 51. Token sits at 47 (4 cells from home). Roll a 6.
POST /api/ludo/games/{id}/move  { "playerIndex": 0, "tokenIndex": 0 }
// old behaviour: newPos = (47 + 6) % 52 = 1 — the token is silently moved PAST its own home
// cell and back out onto the main track, instead of the roll being rejected.
```

### 3. Root Cause
```java
// LudoService#moveToken, before this fix (else branch — token already on the track)
int newPos = (token.getPosition() + dice) % Game.TRACK_SIZE;
... // own-token block check, capture, position set
checkFinished(token, playerIndex, game); // only recognizes an EXACT landing on endPos
```
Nothing between reading the dice value and computing `newPos` ever asked "does this roll carry the
token further than the distance remaining to home?" The modulo arithmetic that correctly wraps a
mid-track move around the 52-cell loop does exactly the wrong thing once a token is close enough
to home that a full 1-6 roll could carry it past that cell — it just keeps wrapping, indistinguishable
in the code from a completely ordinary mid-board move.

### 4. Diagnostic Commands
```bash
# Reproduce directly against the service, no HTTP layer needed:
cd backend && mvn -o -q test -Dtest='com.lld.ludo.LudoServiceTest#moveToken_overshootHomeRejected'

# Confirm the fixed exact-count boundary is also covered the other direction:
mvn -o -q test -Dtest='com.lld.ludo.LudoServiceTest#moveToken_exactRollFinishesToken'
```

### 5. Step-by-Step Resolution
1. Added `LudoService#stepsToHome(Token, playerIndex)`, computing the exact number of cells
   remaining to that color's home cell via `(endPosition - position + TRACK_SIZE) % TRACK_SIZE`.
2. `moveOnTrack` now compares the roll against `stepsToHome` **before** computing `newPos`: a roll
   greater than the steps remaining throws `InvalidMoveException` and leaves the token completely
   unmoved (the chosen contract for an illegal move throughout this module — see also RCA-022); a
   roll exactly equal to the steps remaining transitions the token to `FINISHED` via the new
   `TokenState` machine; anything smaller is an ordinary advance.
3. `LudoService#hasAnyLegalMove` (the roll-time "does this player have any legal move" check) was
   updated to use the same `stepsToHome` boundary, so a roll that would only overshoot every
   on-track token is correctly treated as "no legal move" and the turn auto-passes, rather than
   leaving the player stuck holding an unusable roll (see RCA-022 for the related bug in that same
   check).
4. Added `LudoServiceTest#moveToken_overshootHomeRejected` (asserts the exact rejection and that
   the token's position is provably unchanged) and `#moveToken_exactRollFinishesToken` (asserts the
   boundary case lands and finishes) to pin both sides of the boundary permanently.

### 6. Preventative Measures
1. `moveOnTrack`'s exception message states both the exact distance remaining and the value
   rolled ("needs exactly N to reach home — rolled M"), so a future reader sees the invariant
   enforced explicitly rather than having to re-derive it from modulo arithmetic.
2. General lesson reinforced by this module's zero-test history (the same lesson RCA-014 drew for
   snakeladders): a "wrap around a fixed-size loop" computation is only correct for cells that are
   genuininely mid-loop — any position within striking distance of a designated exit/finish needs
   its own explicit boundary check before the wraparound formula is allowed to run, or the two
   cases become silently indistinguishable in the code.

## RCA-021: Ludo's createGame Indexed a Fixed 4-Slot Player Array Without Validating Its Length

**Severity:** Medium (a real unhandled-500 path reachable by any caller sending anything other
than exactly 4 player names; the frontend's setup form always sends exactly 4, so this never fired
in the shipped UI, but the endpoint accepted the malformed input silently until it blew up)
**Date:** 2026-08-26
**Status:** Resolved
**Affected:** `com.lld.ludo.model.Game` constructor (now `Game.newGame`), `com.lld.ludo.service.LudoService#createGame`

### 1. Overview & Severity
The same boundary question that found RCA-014 in snakeladders — "what happens if the caller sends
the wrong number of player names?" — turned up an identical defect here. The original `Game`
constructor looped `for (int i = 0; i < 4; i++)` and read `playerNames[i]` directly, with nothing
upstream ever checking `playerNames.length` first. A request with fewer than 4 names threw a bare
`ArrayIndexOutOfBoundsException`; this repo's `GlobalExceptionHandler` has no handler for that
exception type (by design — see its own javadoc), so it fell through to Spring's default resolver
as an opaque `500` with the real cause never reaching the response body, exactly the failure mode
RCA-014 already documented for the same bug shape in a sibling module.

### 2. Symptoms & Error Logs
No user-facing report — the frontend's setup form only ever submits exactly 4 names. Direct API
use would have looked like:
```
POST /api/ludo/games  { "players": ["Alice", "Bob"] }
→ HTTP 500 Internal Server Error
  (real cause: ArrayIndexOutOfBoundsException: Index 2 out of bounds for length 2, never surfaced)
```

### 3. Root Cause
```java
// Game(long id, String[] playerNames), before this fix
for (int i = 0; i < 4; i++) {
    players.add(new Player(i, playerNames[i], colors[i])); // <- no length check on playerNames
    ...
}
```
Identical shape to RCA-014: a loop bound (`4`, the fixed size of `COLORS`/`START_POSITIONS`/
`SAFE_SPOTS`) was trusted to also be a safe bound for a completely different, caller-supplied
collection, with nothing checking that the two were actually the same size.

### 4. Diagnostic Commands
```bash
cd backend && mvn -o -q test -Dtest='com.lld.ludo.LudoServiceTest#createGame_rejectsWrongPlayerCount'
grep -n "@ExceptionHandler" backend/src/main/java/com/lld/config/GlobalExceptionHandler.java
```

### 5. Step-by-Step Resolution
1. Added `LudoService#validatePlayerCount`, called at the top of `createGame`, enforcing
   `playerNames.size() == 4` (Ludo's board geometry — 4 fixed colored seats — is compile-time, not
   variable the way Snake & Ladders' 2-4 range is, so the valid range here is a single value, not a
   window) and that no name is null/blank.
2. Added a new typed exception, `InvalidPlayerCountException` (`@ResponseStatus(400)`), extending
   the module's new abstract `LudoException` base — an invalid player list now returns a clean
   `400` with a real message instead of an opaque `500`.
3. Added `LudoServiceTest#createGame_rejectsWrongPlayerCount` (0, 3, 5 names, and `null`) and
   `#createGame_rejectsBlankNames`, covering the boundary this bug lived at.

### 6. Preventative Measures
1. Same lesson RCA-014 already drew, reinforced by a second, independent instance of it in a
   different module: any collection indexed by a caller-supplied size needs its bound validated at
   the entry point before the indexing operation runs, not discovered by whichever exception the
   JDK happens to throw.
2. Moving the player-list assembly out of a raw constructor and into a validated static factory
   (`Game.newGame`, called only after `validatePlayerCount` has already run) makes it structurally
   impossible to construct a `Game` from an unvalidated player list anywhere else in the module —
   the old bare constructor had no such guard rail and could be called directly from any future
   call site.

## RCA-022: Ludo's Skip-Turn Check Under-Reported Blocked Moves, and a Pending Roll Could Be Silently Re-Rolled

**Severity:** Medium (two related roll/move-contract gaps found while writing the state-machine
tests: one could stall a player's turn with a roll that looked legal but had no actually-playable
move and no auto-pass; the other let a caller discard an unfavorable roll and try again for free,
undermining the "roll a 6 to leave home" / exact-count rules the rest of the module enforces)
**Date:** 2026-08-26
**Status:** Resolved
**Affected:** `com.lld.ludo.service.LudoService#rollDice` (now `#doRoll`/`#hasAnyLegalMove`)

### 1. Overview & Severity
Two defects surfaced together while pinning down `rollDice`'s exact contract for the new test
suite:

1. **`hasAnyMove` under-checked home exits.** On a roll of 6, the original check
   (`tokens.stream().anyMatch(Token::isHome)`) reported a legal move existed the moment *any* token
   was HOME — without checking whether that token's start square was actually free. If the start
   square was blocked by the player's own token (a real, reachable board state), `rollDice` would
   never auto-pass the turn, yet every subsequent `moveToken` call for that HOME token would be
   rejected by the very same block check `moveToken` itself enforced. A player could roll
   correctly, be told a move was available, and have no way to actually make one.
2. **No guard against re-rolling a pending, unspent roll.** `rollDice` unconditionally overwrote
   `diceValue` on every call, with nothing checking whether the previous roll had already been
   spent on a move. A caller could roll, dislike the result, and simply call roll again — and
   again — discarding every unfavorable value until a good one appeared, which defeats the "need a
   6 to leave home" and exact-count rules by letting a player route around them by re-rolling
   instead of moving.

### 2. Symptoms & Error Logs
Both were caught by the new suite, not in production:
```
// (1) Player 0 has one token ACTIVE sitting exactly on its own start square (a legal, reachable
// state — e.g. it re-entered there after being captured elsewhere and moving back around), and
// every other token HOME. Roll a 6:
POST /api/ludo/games/{id}/roll   -> 200, diceValue: 6   (looked playable)
POST /api/ludo/games/{id}/move   { playerIndex: 0, tokenIndex: <a HOME token> }
   -> 400 "Start square is blocked by your own token"   (but rollDice never offered to pass the turn)

// (2) Any game, any state:
POST /api/ludo/games/{id}/roll   -> 200, diceValue: 2
POST /api/ludo/games/{id}/roll   -> 200, diceValue: 6   (the 2 was simply discarded, no move required)
```

### 3. Root Cause
Both gaps share one root cause: `rollDice`'s two responsibilities — "is there anything legal to do
with this roll" and "has the previous roll already been resolved" — were each partially
implemented. `hasAnyMove` re-derived home-exit legality with a shortcut (`anyMatch(Token::isHome)`)
instead of calling the same block-check `moveToken` used, so the two could disagree. And nothing
in `rollDice` ever read `diceValue` before overwriting it, because the original design assumed
(without enforcing) that a client would always call `moveToken` between rolls.

### 4. Diagnostic Commands
```bash
cd backend && mvn -o -q test -Dtest='com.lld.ludo.LudoServiceTest#rollDice_autoPassesWhenNoLegalMove'
mvn -o -q test -Dtest='com.lld.ludo.LudoServiceTest#rollDice_alreadyRolledRejected'
```

### 5. Step-by-Step Resolution
1. Rewrote `hasAnyLegalMove` to call the exact same `isBlockedByOwnToken`/`stepsToHome` helpers
   `moveOutOfHome`/`moveOnTrack` use, so "rollDice says a move exists" and "moveToken accepts that
   move" can never disagree again.
2. Added a guard at the top of `doRoll`: if `game.getDiceValue() != 0` (a previous roll is still
   unspent), the call throws `InvalidMoveException` instead of overwriting it — a pending roll must
   now be resolved with `moveToken` before another roll is accepted.
3. Added `LudoServiceTest#rollDice_autoPassesWhenNoLegalMove` and `#rollDice_alreadyRolledRejected`
   to pin both fixes, plus `LudoConcurrencyTest`'s per-game-lock races to prove the roll/move
   check-and-write stays atomic under concurrent access.

### 6. Preventative Measures
1. `doRoll` and `doMove` now share one documented contract, stated on `LudoService`'s class
   javadoc: a game alternates strictly between "no pending roll" and "pending roll," and each
   method enforces its own half of that invariant rather than trusting the caller's call order.
2. General lesson: when two code paths (a "can I do X" check and the code that actually does X)
   independently re-derive the same legality rule, they will eventually drift — as `hasAnyMove` and
   `moveToken`'s block check already had. Extracting the shared predicate once removes the
   possibility structurally instead of relying on the two staying manually in sync.

## RCA-023: A Duplicate `@Component` Simple Class Name Between Ludo and Snake & Ladders Broke the Entire Spring Context at Test Time

**Severity:** High (not confined to ludo — it failed `ApplicationContext` startup for the whole
`com.lld` component scan, taking down every `@SpringBootTest`-based suite in the repo, including
unrelated modules' `ErrorContractIntegrationTest`)
**Date:** 2026-08-26
**Status:** Resolved
**Affected:** `com.lld.ludo.dice.RandomDiceRoller`, `com.lld.snakeladders.dice.RandomDiceRoller`,
every `@SpringBootTest` in the repo (via `com.lld.config.ErrorContractIntegrationTest`)

### 1. Overview & Severity
Adding ludo's injectable-dice pair (`DiceRoller` / `RandomDiceRoller` / `FixedDiceRoller`), modeled
directly on `com.lld.snakeladders.dice`'s existing classes of the same name, reproduced the exact
same simple class name — `RandomDiceRoller` — as a second, unrelated `@Component`. Spring's
component scan derives a bean name from the *simple* class name when none is given explicitly
(`randomDiceRoller` for both), and two different classes registering the same bean name is a hard
`ConflictingBeanDefinitionException` that aborts the whole `ApplicationContext`. Because
`LldApplication` scans all of `com.lld` in one pass, this was not a ludo-local failure: every test
in the module that boots the full Spring context (`ErrorContractIntegrationTest`, which exists
purely to prove routing/error-handling wiring for airline/library/stockbroker) failed with 5
`IllegalStateException`s, none of which mentioned ludo anywhere in their own stack trace — the real
cause was three frames down, in a nested `ConflictingBeanDefinitionException`.

### 2. Symptoms & Error Logs
```
[ERROR] ErrorContractIntegrationTest.frameworkErrorsAreUntouched -- Time elapsed: 0.003 s <<< ERROR!
java.lang.IllegalStateException: Failed to load ApplicationContext for [...]
Caused by: org.springframework.beans.factory.BeanDefinitionStoreException: Failed to parse
configuration class [com.lld.LldApplication]
Caused by: org.springframework.context.annotation.ConflictingBeanDefinitionException:
Annotation-specified bean name 'randomDiceRoller' for bean class
[com.lld.snakeladders.dice.RandomDiceRoller] conflicts with existing, non-compatible bean
definition of same name and class [com.lld.ludo.dice.RandomDiceRoller]
```
The other 4 `ErrorContractIntegrationTest` cases failed identically via JUnit/Spring's "context
failure threshold exceeded" short-circuit once the first attempt had already failed — a single
root cause fanned out into 5 reported test errors, none obviously pointing at ludo.

### 3. Root Cause
Both `snakeladders.dice.RandomDiceRoller` and the new `ludo.dice.RandomDiceRoller` are annotated
`@Component` with no explicit bean name. Spring's default naming strategy
(`AnnotationBeanNameGenerator`) uses the decapitalized simple class name, ignoring the package —
so two classes in different packages with the same simple name collide the instant both are on the
classpath of one component scan. `LldApplication`'s `@SpringBootApplication(scanBasePackages =
"com.lld")` scans every module in a single application context, so any two modules that copy the
same "reference module" naming convention (`RandomDiceRoller`, mirrored intentionally from
snakeladders per this module's own design brief) are one collision away from breaking the whole
build's context-loading tests, not just their own.

### 4. Diagnostic Commands
```bash
# Reproduce and see the real cause 3 frames down:
cd backend && mvn -o -q test -Dtest='com.lld.config.ErrorContractIntegrationTest' 2>&1 | grep -A2 ConflictingBeanDefinitionException

# Find every other simple-class-name collision across modules before it bites the same way:
find backend/src/main/java -name '*.java' -exec basename {} \; | sort | uniq -d
```

### 5. Step-by-Step Resolution
1. Gave `com.lld.ludo.dice.RandomDiceRoller` an explicit bean name,
   `@Component("ludoRandomDiceRoller")`, so its registered name no longer collides with
   snakeladders' `randomDiceRoller`. `FixedDiceRoller` was never at risk — it is not a `@Component`
   in either module, only ever constructed directly.
2. Re-ran the full suite (`mvn -o -q test`) to confirm `ErrorContractIntegrationTest` and every
   other `@SpringBootTest` loaded cleanly again, alongside ludo's own new suites.
3. Documented the collision risk directly in `RandomDiceRoller`'s javadoc so the next module that
   copies this same "RandomXRoller/FixedXRoller" naming convention from a sibling module knows to
   qualify its bean name up front instead of discovering the collision at test time.

### 6. Preventative Measures
1. `find backend/src/main/java -name '*.java' -exec basename {} \; | sort | uniq -d` (the
   diagnostic above) is a cheap pre-merge check for this exact class of collision — run it whenever
   a new module deliberately mirrors a sibling module's class names (a common, encouraged pattern
   in this repo's "match the reference module's shape" convention).
2. General lesson: `@SpringBootApplication(scanBasePackages = "com.lld")` scanning every module
   into one context means bean-name uniqueness is a whole-repo constraint, not a per-module one —
   any two modules are free to reuse each other's class *names* (Java's package system already
   disambiguates the types themselves) but not their default *bean* names. An explicit
   `@Component("...")` value is required the moment a class name is intentionally copied from
   another module, not just when a real naming clash is suspected.
3. This is also why a single hard failure in one area can present as failures in a completely
   unrelated test class (`ErrorContractIntegrationTest` covers airline/library/stockbroker, not
   ludo) — when a `@SpringBootTest`-based suite fails with `Failed to load ApplicationContext`,
   read the full `Caused by:` chain before assuming the failing test class's own domain is at
   fault.

## RCA-024: Airline's `confirmSeats` Could Release an Already-Booked Seat Back to AVAILABLE When a Client Skipped the Hold Step

**Severity:** High (a confirmed passenger's seat could be silently freed and double-sold — the
exact race the module's `SeatLockManager` exists to prevent)
**Date:** 2026-08-26
**Status:** Resolved
**Affected:** `com.lld.airline.service.SeatLockManager#confirmSeats`, `com.lld.airline.service.AirlineService#bookFlight`

### 1. Overview & Severity
Auditing the airline module's concurrency layer against `movieticket`/`concertticket`'s
`SeatLockManager` idiom (per this build-out's own reference pattern) surfaced a genuine
overbooking hazard in `confirmSeats`, the method `bookFlight` calls to turn a HELD seat into a
BOOKED one. The re-validation branch treated "not currently HELD by this caller" as a single
undifferentiated case — which also covers a seat that is already `BOOKED` by a *different*
passenger, not just a stale/expired hold. In that branch it unconditionally reset the seat back to
`AVAILABLE` before throwing. A client that called the booking endpoint directly against an
already-confirmed seat (skipping the hold step, whether by a buggy retry, a malicious direct POST,
or simply racing with someone else's just-completed booking) would silently release that other
passenger's confirmed seat back into the pool — the airline analogue of losing someone's paid seat
assignment.

### 2. Symptoms & Error Logs
No test in the pre-audit suite exercised this path — `AirlineServiceTest` only ever booked seats it
had itself held first, so the bug was latent rather than observed in CI. It was found by writing
`testOverbookingRejectedWhenSeatAlreadyBooked` (a second passenger calling `bookFlight` on seat `5A`
immediately after the first passenger's booking confirmed, without holding first):
```
expected: <com.lld.airline.exception.SeatNotAvailableException>
 but was: <com.lld.airline.exception.HoldExpiredException>
org.opentest4j.AssertionFailedError
	at AirlineServiceTest.testOverbookingRejectedWhenSeatAlreadyBooked(AirlineServiceTest.java)
```
and a follow-up assertion — `flight.getSeat("5A").getStatus()` — showed the seat had flipped back
to `AVAILABLE` after the second (rejected) call, even though the first passenger's booking was
still `CONFIRMED`.

### 3. Root Cause
```java
// SeatLockManager#confirmSeats, before the fix
if (seat.getStatus() != SeatStatus.HELD || !userId.equals(seat.getHeldByUserId()) || now > seat.getHoldExpiresAt()) {
    seat.setStatus(SeatStatus.AVAILABLE);   // <-- runs even when status == BOOKED
    seat.setHeldByUserId(null);
    seat.setHoldExpiresAt(0L);
    throw new HoldExpiredException(...);
}
```
The condition's three clauses were meant to catch "hold expired" / "held by someone else" /
"never held at all," but `status == BOOKED` also satisfies `status != HELD`, so it fell into the
same branch as a genuinely stale hold and was reset identically. The method held the correct
per-seat lock the whole time (this was never a missing-lock race), so the bug was a pure logic
error inside the critical section, not a concurrency gap — the lock protected the wrong invariant.

### 4. Diagnostic Commands
```bash
# Reproduce directly against the service layer:
cd backend && mvn -o -q test -Dtest='AirlineServiceTest#testOverbookingRejectedWhenSeatAlreadyBooked'

# Find every other "reset on any non-HELD status" pattern in the sibling seat-lock managers,
# in case the same shortcut was copied elsewhere:
grep -rn "SeatStatus.AVAILABLE);$" backend/src/main/java/com/lld/*/service/SeatLockManager.java
```

### 5. Step-by-Step Resolution
1. Added an explicit `status == BOOKED` guard *before* the reset branch, throwing
   `SeatNotAvailableException` (the correct "someone else already has this" signal — matching how
   `holdSeats` reports the same situation) and returning immediately, so a booked seat is never
   touched.
2. Narrowed the reset-to-`AVAILABLE` side effect in the remaining branch to only fire when
   `status == HELD` (i.e. a genuinely stale hold), so a seat that was never held by anyone
   (`status == AVAILABLE`, which should not reach `confirmSeats` at all but is now handled safely
   regardless) is not mutated either.
3. Rewrote `testOverbookingRejectedWhenSeatAlreadyBooked` to assert both the new exception type and
   that seat `5A` remains `BOOKED` after the rejected second call, then re-ran the full airline
   suite (`mvn -o -q test -Dtest='com.lld.airline.**'`) to confirm the existing hold-expiry test
   (`testHoldExpiryAtCommit`, which legitimately depends on the stale-hold reset still firing) kept
   passing.

### 6. Preventative Measures
1. `movieticket.service.SeatLockManager#confirmSeats` was checked for the same shortcut — it does
   not have it, because it validates `status != HELD` and a separate stale-hold branch rather than
   folding three unrelated conditions into one reset. Airline's `SeatLockManager` predates that
   module's audit and had drifted from the safer shape; it now matches it.
2. General lesson for any seat/resource state machine in this repo: when a re-validation check
   ORs together multiple distinct failure reasons ("expired," "held by someone else," "never
   held," "already finalized by someone else"), each reason needs its own branch if the recovery
   action differs — collapsing them into one `if` with one shared side effect silently applies the
   wrong side effect to at least one of the cases. A confirmed/terminal state should never be
   mutated by a code path whose job is only to clean up a still-pending one.
3. This is exactly the kind of gap a "confirm it does what it claims" audit test catches and a
   happy-path-only test suite cannot — `AirlineConcurrencyTest`'s contested-seat races only ever
   raced `holdSeats` against `holdSeats`; the missing case was a `bookFlight` call landing on a seat
   someone else had *already finished* booking. Any module with a hold→confirm two-phase seat flow
   should carry an explicit "confirm rejects an already-booked seat without mutating it" test
   alongside its hold-collision tests, not just infer the guarantee from the lock.

## RCA-025: Deepening Airline's Strategy Layer Reintroduced Both of RCA-023's Failure Modes at Once — a Bean-Name Collision and an Unresolvable Multi-Constructor Bean

**Severity:** High (broke `ApplicationContext` startup for the whole `com.lld` component scan —
identical blast radius to RCA-023 — plus, independently, would have broken it again even after
the first fix)
**Date:** 2026-08-26
**Status:** Resolved
**Affected:** `com.lld.airline.strategy.PricingStrategyFactory`, `com.lld.airline.service.AirlineService`,
every `@SpringBootTest` in the repo (via `com.lld.config.ErrorContractIntegrationTest`)

### 1. Overview & Severity
Adding `PricingStrategyFactory` and `RefundPolicyFactory` to give airline's pricing/refund
Strategy pattern a real `EnumMap`-resolved factory (matching `inventory.strategy.ReorderStrategyFactory`,
the exact template this build-out has been copying module to module) reproduced RCA-023's bean-name
collision the very next day: `com.lld.airline.strategy.PricingStrategyFactory` and
`com.lld.carrental.strategy.PricingStrategyFactory` and `com.lld.parkinglot.strategy.PricingStrategyFactory`
all share the same simple class name, and `carrental`'s copy had *already* been given an explicit
`@Component("carRentalPricingStrategyFactory")` name — evidence this exact class of bug had already
bitten this repo for this exact class name before RCA-023 was even written, and the lesson didn't
propagate to the new copy. Fixing that collision then uncovered a second, unrelated wiring bug in
the same class: giving `AirlineService` a second constructor (for repository-isolated tests) with
neither constructor annotated `@Autowired` left Spring unable to pick one, so it fell back to
looking for a no-arg constructor that doesn't exist.

### 2. Symptoms & Error Logs
Both bugs surfaced as the same downstream symptom — every `@SpringBootTest`-based suite in the
repo failing `Failed to load ApplicationContext`, not just an airline-local failure:
```
[ERROR] ErrorContractIntegrationTest.frameworkErrorsAreUntouched -- Time elapsed: 0.003 s <<< ERROR!
java.lang.IllegalStateException: Failed to load ApplicationContext for [...]
```
Bug 1 (`mvn test` run #1), several frames down:
```
Caused by: org.springframework.context.annotation.ConflictingBeanDefinitionException:
Annotation-specified bean name 'pricingStrategyFactory' for bean class
[com.lld.parkinglot.strategy.PricingStrategyFactory] conflicts with existing, non-compatible bean
definition of same name and class [com.lld.airline.strategy.PricingStrategyFactory]
```
Bug 2 (`mvn test` run #2, *after* fixing bug 1 — the exact same test class failed again with a
completely different root cause underneath the identical outer symptom):
```
Caused by: org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean
with name 'airlineController': ... Error creating bean with name 'airlineService': Failed to
instantiate [com.lld.airline.service.AirlineService]: No default constructor found
Caused by: java.lang.NoSuchMethodException: com.lld.airline.service.AirlineService.<init>()
```
A same-session `AirlineConcurrencyTest` run also failed alongside the first bug, but for a third,
independent reason (wrong seat numbers in the new test — out-of-range rows on the seeded aircraft
layout); it is called out here only because it landed in the same `mvn test` output and could have
been mistaken for a consequence of either Spring bug. It wasn't — fixing it required no service or
config change, only correcting the test's seat numbers to the seeded 3–15 row range.

### 3. Root Cause
Bug 1: identical to RCA-023 — Spring's default bean-name generator uses the decapitalized simple
class name regardless of package, so `PricingStrategyFactory` in `airline`, `carrental` and
`parkinglot` all default to bean name `pricingStrategyFactory` unless given an explicit
`@Component("...")` value. `carrental` had already worked around this; `parkinglot` and the new
`airline` copy had not, so the *first* two `PricingStrategyFactory` beans to register (in package
scan order) silently won and the third threw `ConflictingBeanDefinitionException`.

Bug 2: `AirlineService` was given a second, 4-argument constructor purely so unit tests could
construct it without threading through a repository instance explicitly, alongside the original
5-argument constructor `AirlineService` now needs (`AirlineRepository` plus its four collaborators).
Spring's constructor-autowiring resolution requires either exactly one constructor, or one
explicitly marked `@Autowired`, when a class has no no-arg constructor. With two unannotated
constructors present, Spring could not deterministically choose and fell back to
`getDeclaredConstructor()` with no arguments — which doesn't exist on this class — rather than
picking the larger, fully-satisfiable constructor.

### 4. Diagnostic Commands
```bash
# Reproduce and see the real cause several frames down, for either bug:
cd backend && mvn -o -q test -Dtest='com.lld.config.ErrorContractIntegrationTest' 2>&1 | grep -A2 "Caused by"

# Find every other simple-class-name collision across modules before it bites the same way
# (the same check RCA-023 recommended — it would have caught this one too, a day later):
find backend/src/main/java -name '*.java' -exec basename {} \; | sort | uniq -d

# Find any other @Component/@Service/@Repository class with more than one constructor and no
# @Autowired annotation on any of them — the shape that produced bug 2:
grep -rL "@Autowired" $(grep -rl "public [A-Za-z]*(" backend/src/main/java/com/lld/*/service/*.java) 2>/dev/null
```

### 5. Step-by-Step Resolution
1. Gave both new factories explicit bean names — `@Component("airlinePricingStrategyFactory")` and
   `@Component("airlineRefundPolicyFactory")` — following `carrental`'s existing precedent for this
   exact class name, and documented the collision risk in both classes' javadoc so the next module
   that copies the `ReorderStrategyFactory` template doesn't repeat it a third time.
2. Re-ran `mvn test`; `ConflictingBeanDefinitionException` was gone, but `ErrorContractIntegrationTest`
   failed again with a different `Caused by:` chain — read that chain fully rather than assuming the
   first fix was sufficient (the same lesson RCA-023 §3 already called out).
3. Added `@Autowired` to the 5-argument `AirlineService` constructor (the one with an
   `AirlineRepository` parameter — the one Spring should actually use in production) and documented
   in its javadoc why the 4-argument convenience constructor exists and why it must stay
   unannotated.
4. Fixed the unrelated `AirlineConcurrencyTest` seat-number bug found in the same run (seats named
   `20A`–`23B` don't exist — the seeded 737 layout only has rows 1–15) by moving every contested/
   disjoint seat in that test into the valid row range.
5. Re-ran the full suite (`mvn -o -q test`) to confirm `ErrorContractIntegrationTest` and every
   airline suite passed together, with zero unrelated regressions.

### 6. Preventative Measures
1. Run `find backend/src/main/java -name '*.java' -exec basename {} \; | sort | uniq -d` as a
   pre-merge check on *every* PR that copies a class name from a sibling module's "reference
   pattern" (Strategy+Factory, SeatLockManager, PaymentProcessor, etc.) — this is the second time
   in two days this repo's own copy-the-reference-module convention has produced this exact bug
   class, and it will keep recurring as more modules copy `ReorderStrategyFactory`'s shape unless
   this becomes a standing habit, not a one-off fix.
2. Any `@Component`/`@Service`/`@Repository` class with more than one constructor needs an explicit
   `@Autowired` on the one Spring should use, full stop — even when every constructor's parameters
   are individually satisfiable as beans, Spring will not guess. A convenience constructor added
   for tests is exactly the situation that introduces this without anyone intending to add "a
   second constructor" as a deliberate design change.
3. When a test run reports multiple, unrelated-looking failures together, don't fix one and declare
   victory — diagnose each independently. Here, three genuinely separate bugs (a bean collision, an
   ambiguous constructor, and a bad seat number in a brand-new test) all surfaced in the same `mvn
   test` invocation; fixing only the first would have left CI red twice more in a row, each time
   looking like a fresh, mysterious failure instead of the next item on an already-visible list.

## RCA-026: Elevator's Two-Phase Dispatch Queued a Placeholder Stop That Was Never the Rider's Real Destination

**Severity:** Medium (every real elevator trip made one spurious extra stop, and a rider's request
could never be correctly marked `COMPLETED` at the floor they actually asked for)
**Date:** 2026-08-26
**Status:** Resolved
**Affected:** `com.lld.elevator.service.ElevatorControllerService#handleExternalRequest`,
`#assignRequestToElevator`, `#completeMatchingRequests`

### 1. Overview & Severity
Raising the elevator module to the reference bar meant reading `ElevatorControllerService` closely
enough to add a guarded state machine around every `setState` call — which required understanding
exactly which floors each state transition was reacting to. That reading surfaced a genuine
correctness bug in the existing, pre-upgrade dispatch flow: `handleExternalRequest(sourceFloor,
direction)` built its `Request` with a **placeholder** destination floor (`sourceFloor +/- 1`,
whichever direction the caller pressed) rather than the rider's real destination, and
`assignRequestToElevator` queued that placeholder as an actual elevator stop. The real destination
was only added afterward via a separate `handleInternalRequest` call — meaning every dispatched car
ended up with three queued stops (source, placeholder, real destination) instead of two, making one
extra, unrequested stop on every single trip. Because `completeMatchingRequests` compared an
elevator's arrival floor against `request.getDestinationFloor()` — which held that same placeholder,
never the real destination — a request could also never be marked `COMPLETED` at the floor the rider
actually got off on.

### 2. Symptoms & Error Logs
No exception or crash — this was a silent behavioral defect, not a failure. It would only surface as:
- An elevator visibly stopping at an unrequested floor one step past every pickup, in the live
  building visualizer.
- `GET /api/elevator/requests` showing a `Request`'s `destinationFloor` field that never matched
  what the caller actually asked the `/request` endpoint for.
- No test previously exercised end-to-end trip completion against the real requested floor —
  `ElevatorConcurrencyTest`'s only assertion was capacity-never-exceeded, which this bug happens
  not to violate, so the existing suite passed straight through it.

### 3. Root Cause
```java
// before — sourceFloor +/- 1 is NOT the rider's real destination:
Request request = new Request(sourceFloor, sourceFloor + (direction == Direction.UP ? 1 : -1));
...
elevator.addStop(request.getSourceFloor());
elevator.addStop(request.getDestinationFloor());   // queues the placeholder as a real stop
```
The design split dispatch into two calls — `handleExternalRequest(sourceFloor, direction)`
("call button pressed") followed by a separate `handleInternalRequest(elevatorId, toFloor)`
("floor button pressed once inside") — modeling a real elevator's two physical buttons. But the
caller (`ElevatorService#requestElevator(fromFloor, toFloor)`) already knows *both* floors up front
(the frontend's `/request` call always supplies both), so the first phase had no real destination to
put in the `Request` and synthesized one just to satisfy the constructor — never intending it to be
a real queued stop, but `assignRequestToElevator` queued it anyway.

### 4. Diagnostic Commands
```bash
# Watch the actual stops queued for a single dispatched request:
cd backend && mvn -o -q test -Dtest='ElevatorControllerServiceTest#tripCompletesAtTheRealRequestedDestinationNotABogusPlaceholder'

# Before the fix, this would show 3 stops (source, sourceFloor+/-1, realDestination) instead of 2 —
# inspect Elevator#getPendingFloors() right after assignment in a debugger or an ad-hoc print.
```

### 5. Step-by-Step Resolution
1. Changed `handleExternalRequest`'s signature to `(sourceFloor, destinationFloor)` — the real
   destination, not a direction — deriving `Direction` from the two floors instead of taking it as
   a separate parameter. `Request.of(sourceFloor, destinationFloor)` now always carries the rider's
   actual destination from the moment the request is created.
2. `assignRequestToElevator` now queues `request.getSourceFloor()` and `request.getDestinationFloor()`
   in one step — both real floors, no placeholder — so `completeMatchingRequests` correctly matches
   a request's completion against the floor the rider actually asked for.
3. `ElevatorService#requestElevator(fromFloor, toFloor)` simplified to a single
   `controller.handleExternalRequest(fromFloor, toFloor)` call, removing the now-unnecessary
   follow-up `handleInternalRequest` call it previously made to add the real destination after the
   fact. `handleInternalRequest` itself is unchanged and still exercised independently — it remains
   the correct path for a rider already on board pressing a different floor than what was announced
   downstairs.
4. Found and fixed the same-shaped edge case in the sim engine's `simRequest`, which had an
   equivalent same-floor-assignment gap (a car assigned a call at the floor it was already parked on
   never removed that floor from its own pending-stop set — a stale entry that would sit unused in
   the set forever). Added `elevator.removeStop(target)` to both the real and sim same-floor branches
   of assignment, matching what `stepSimulation` already does when a car arrives at a stop mid-transit.
5. Added `ElevatorControllerServiceTest#requestElevatorAssignsBothSourceAndDestinationStopsUpFront`
   and `#tripCompletesAtTheRealRequestedDestinationNotABogusPlaceholder`, which fail against the
   pre-fix code (the former by finding a bogus queued floor between source and destination, the
   latter by timing out waiting for `COMPLETED` at the real destination) and pass against the fix.

### 6. Preventative Measures
1. Whenever a service splits one logical operation into two calls "because a real-world device has
   two buttons," check whether the *caller* actually has both pieces of information available at
   the first call site — if it does (as here), the split adds a placeholder-data risk with no
   corresponding benefit, and the two calls should collapse into one.
2. A synthesized/placeholder value that is only meant to satisfy a constructor's required field
   should never be capable of flowing into a code path that treats it as real domain data (here: an
   actual elevator stop) — either make the field genuinely optional, or don't construct the object
   until the real value is known, as the fix now does.
3. `ElevatorConcurrencyTest`'s original assertion set (capacity-never-exceeded) is a real, useful
   invariant but does not on its own prove *correctness* of dispatch, only *safety*. Any module with
   a fixed-point "did the operation complete against the right target" check available (here:
   stepping the simulation to completion and asserting `COMPLETED` lands at the real requested
   floor) should have at least one test that asserts it end-to-end, not just the safety invariant.

## RCA-027: Parking Lot's `payAndExit` Had an Unguarded Check-Then-Act That Let a Ticket Be Paid Twice

**Severity:** Medium (a double-tap on the exit kiosk, or a retried request after a slow response,
could charge a vehicle twice and attempt to release its spot twice)
**Date:** 2026-08-28
**Status:** Resolved
**Affected:** `com.lld.parkinglot.service.ParkingLotService#payAndExit`,
`com.lld.parkinglot.repository.ParkingLotRepository`

### 1. Overview & Severity
Raising the parking-lot module to the reference bar meant adding a concurrency test for the classic
"two vehicles assigned the same spot" race first — and finding that race was already closed:
`occupySpot` held one `ReentrantLock` across the entire search-then-claim, so two threads calling
`entry()` concurrently for the last spot of a type already resolved to exactly one winner. Writing
the equivalent test for the exit side (`payAndExit`) surfaced a real, still-open check-then-act race:
the service read `ticket.getExitTime() == null` / `ticket.getPaymentStatus() != PAID` and, with no
lock between the read and the writes, then called `ticket.setExitTime(...)`, computed a price, and
called `repository.releaseSpot(...)`. Two threads racing `payAndExit` for the same ticket number
could both pass the check before either had written anything, both compute a charge, both mark the
ticket PAID, and both call `releaseSpot` on the same spot — the vehicle billed twice, and a second,
unrelated vehicle assignable to that spot before the first one had physically left.

### 2. Symptoms & Error Logs
No exception under single-threaded use — the bug is invisible without genuine concurrent load. Under
contention it would show as:
- Two successful `200 OK` responses to `POST /api/parking/exit/pay` for the same `ticketNumber`,
  each returning a receipt (the API contract implies exactly one payment per ticket).
- `ticket.getAmount()` and `ticket.getPaymentMethod()` reflecting whichever thread's write happened
  to land last, with no record that a second payment was ever attempted.
- `releaseSpot(spotId)` called twice for one exit — harmless in isolation since `setOccupied(false)`
  is idempotent, but paired with a concurrent `entry()` for the same spot type, a second vehicle
  could be assigned that spot while the first was still physically parked in it.

### 3. Root Cause
```java
// before — ParkingLotService#payAndExit, no lock between the check and the writes:
Ticket ticket = repository.getTicket(ticketNumber);
if (ticket == null) throw new IllegalArgumentException("Invalid ticket: " + ticketNumber);
if (ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID || ticket.getExitTime() != null) {
    throw new IllegalStateException("Ticket already used for exit");
}
ticket.setExitTime(LocalDateTime.now());               // WRITE — no lock held
double amount = pricingStrategy.calculatePrice(ticket);
ticket.setAmount(amount);
ticket.setPaymentStatus(Ticket.PaymentStatus.PAID);     // WRITE — no lock held
repository.updateTicket(ticket);
repository.releaseSpot(ticket.getSpotId());
```
`ParkingLotRepository` already had a `ticketLock`, but it only guarded `generateTicketNumber()` — a
completely different operation. The read-check-write sequence above ran with no lock at all, so
nothing prevented two threads from interleaving between the `if` and the `ticket.setPaymentStatus`
calls. This is the same bug shape as the elevator/ludo/inventory concurrency fixes made earlier in
this build-out session: a service-layer check followed by an unguarded write, rather than the check
and the write being one atomic operation under a single lock acquisition.

### 4. Diagnostic Commands
```bash
# Prove exactly one of N concurrent exits for the same ticket succeeds:
cd backend && mvn -o -q test -Dtest='ParkingLotConcurrencyTest#concurrentPayAndExit_forTheSameTicket_exactlyOneThreadWins'

# Before the fix, this would show successes > 1 and rejections < threadCount - 1 —
# both counted via AtomicInteger from CountDownLatch-released threads, not sleeps.
```

### 5. Step-by-Step Resolution
1. Added `ParkingLotRepository#completeExit(ticketNumber, exitTime, pricingStrategy, paymentMethod)`,
   which acquires `ticketLock`, re-reads the ticket, re-checks not-found / already-exited *inside*
   the lock, and only then mutates `exitTime`/`amount`/`paymentStatus`/`paymentMethod` — the check
   and the write are now one atomic operation, the same pattern `occupySpot` already used for spot
   allocation.
2. Pricing is computed **inside** the lock too, using the strategy passed in by the service — not
   before acquiring it — so there is no window between "compute the charge" and "mark PAID" for a
   second thread to interleave into.
3. `ParkingLotService#payAndExit` now delegates the whole check-then-pay sequence to
   `completeExit` and only calls `releaseSpot` after it returns successfully — a thread that loses
   the race throws before ever reaching `releaseSpot`, so a spot is never released twice for one exit.
4. The ad-hoc `IllegalArgumentException`/`IllegalStateException` throws this touched were replaced
   with the new typed `TicketNotFoundException` (404) / `TicketAlreadyExitedException` (409) as part
   of the same pass, so a losing thread now gets a status code that actually distinguishes "no such
   ticket" from "already paid" instead of a flat 400 either way.
5. Added `ParkingLotConcurrencyTest#concurrentPayAndExit_forTheSameTicket_exactlyOneThreadWins` (10
   `CountDownLatch`-released threads, run 5x via `@RepeatedTest`, asserting exactly one success,
   `threadCount - 1` `TicketAlreadyExitedException` rejections, and the spot released exactly once)
   alongside the pre-existing-but-now-formalized spot-allocation race test
   (`concurrentEntry_forTheLastSpot_exactlyOneVehicleWins`), which passes both before and after this
   fix — confirming that race really was already closed and this change didn't need to touch it.

### 6. Preventative Measures
1. A `ReentrantLock` field sitting next to a method name that sounds related (`ticketLock` next to
   ticket-mutating code) is not evidence that method is actually guarded by it — grep for
   `.lock()`/`.unlock()` call sites specifically, don't infer locking discipline from field placement.
2. Any check-then-act on shared mutable state (`if (record.isEligible()) { record.mutate(); }`)
   needs the check re-performed *inside* the same lock acquisition as the write, not just a lock
   somewhere nearby — the two halves must be one atomic operation, matching the fix already applied
   to `occupySpot`'s search-then-claim.
3. When a module's "obviously correct" locking (spot allocation, here) sits next to an "obviously
   parallel" but actually-unguarded operation (ticket exit), write the concurrency test for *both*
   before assuming either is safe — the working one confirms the pattern, the broken one won't show
   up without a `CountDownLatch`-forced race, never from reading the code alone.

## RCA-028: Pub/Sub's Subscriber Message History Was Keyed by Id Alone, Leaking One Topic's Messages Into Another's Lookup

**Severity:** Medium (silent data isolation bug, not a crash — `getSubscriberMessages` never threw
or logged anything wrong; it just quietly returned the wrong topic's message history for any
subscriber id that happened to be active on more than one topic, and a completely unrelated
`PubSubException` never had a chance to fire against a 5xx status because nothing had ever
exercised the module's second-worst exception mapping either)
**Date:** 2026-08-28
**Status:** Resolved
**Affected:** `com.lld.pubsub.service.PubSubService#getSubscriberMessages` and its backing
`activeSubscribers` map (before fix); `com.lld.pubsub.exception.DispatchFailedException` (before fix)

### 1. Overview & Severity
Auditing the pubsub module against the 17-criteria bar (it had never had an explicit `/audit-lld`
pass — it was on HANDOFF.md's "unverified" list) surfaced two related but distinct problems while
reading `PubSubService` line by line, not from any failing test — the module's only test file never
exercised either path:

1. `PubSubService#getSubscriberMessages(String topicName, String subscriberId)` accepted a
   `topicName` parameter and never used it to validate anything. The subscriber lookup went
   straight to `activeSubscribers.get(subscriberId)` — a `Map<String, Subscriber>` keyed by
   subscriber id **alone**. If the same subscriber id was ever active on two different topics (the
   API allows exactly this — nothing stopped `subscribe("topic-a", "sub-1", ...)` followed by
   `subscribe("topic-b", "sub-1", ...)`), the second `subscribe()` call's `activeSubscribers.put(...)`
   silently overwrote the first topic's entry. Calling `getSubscriberMessages("topic-a", "sub-1")`
   after that would return **topic-b's** message history under topic-a's name, with no error,
   because the `topicName` argument was accepted but never checked against anything.
2. `activeSubscribers` was a bare `HashMap`, not a `ConcurrentHashMap` — mutated from
   `subscribe`/`unsubscribe`, both callable concurrently from different HTTP request threads, with
   no lock of its own. This had not yet produced a visible corruption or a `ConcurrentModificationException`
   in the wild, but was a real, live thread-safety bug independent of the id-collision issue above.
3. Separately, `DispatchFailedException` (one of the module's three original typed exceptions) was
   annotated `@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)` — a 5xx status on a
   `DomainException` subclass, which `config.DomainExceptionContractTest#noneMapToServerError` exists
   specifically to catch. It had never fired that guard because nothing in the codebase ever threw
   `DispatchFailedException` — it was dead code, declared but unreachable, so the 5xx mapping had
   been sitting live and unguarded (`DomainExceptionContractTest` only scans exceptions that exist,
   it cannot fail on one no code path throws) since the exception was first added.

### 2. Symptoms & Error Logs
None recorded — no test, manual QA pass, or production-shaped run had ever subscribed the same id
to two different topics, so the overwrite and the resulting cross-topic leak had never been
observed. This is exactly why it survived: `getSubscriberMessages` returns `200 OK` with a
plausible-looking `List<Message>` body in both the correct and the leaked case — there is no
distinguishing error shape to grep for after the fact.

### 3. Root Cause
`activeSubscribers` was designed as a simple "remember the `Subscriber` object I just constructed
so I can read its `receivedMessages` list later" cache, and was keyed the same way the earlier,
simpler version of the module modeled subscription — as if a subscriber id were globally unique
across the whole broker, not scoped to the topic it subscribed to. The public API (`subscribe`
takes both a `topicName` and a `subscriberId`) always allowed the same id on multiple topics; the
internal cache's key shape just never caught up to that.

### 4. Diagnostic Commands
```bash
# The lookup that never used its own topicName parameter (before fix):
git show origin/main:backend/src/main/java/com/lld/pubsub/service/PubSubService.java \
  | sed -n '/public List<Message> getSubscriberMessages/,/^    }/p'

# The id-only cache backing it, and that it was a plain HashMap:
git show origin/main:backend/src/main/java/com/lld/pubsub/service/PubSubService.java \
  | grep -n "activeSubscribers"

# The dead-code, mismapped exception:
git show origin/main:backend/src/main/java/com/lld/pubsub/exception/DispatchFailedException.java
grep -rn "new DispatchFailedException" backend/src/main/java  # zero hits before this fix
```

### 5. Step-by-Step Resolution
1. Replaced the id-only `HashMap` with `PubSubRepository` (already present in the module but never
   wired into the service at all — a second, separate finding) keyed by a composite
   `topicName + "::" + subscriberId`, backed by `ConcurrentHashMap`. The same subscriber id on two
   different topics now gets two independently tracked entries.
2. `getSubscriberMessages` now validates via `Topic#hasSubscriber(subscriberId)` before doing any
   lookup, throwing the new `SubscriberNotFoundException` (404) if that id isn't actually registered
   on `topicName` — closing the "any topic name works as long as the id exists somewhere" hole
   entirely, rather than just fixing the storage key.
3. Gave the real service and the isolated `/sim/*` sandbox each their own separate
   `PubSubRepository` instance, mirroring the existing separate-`Broker` isolation, so the fix could
   not reintroduce a live/sim data leak while fixing the cross-topic one.
4. Recast `DispatchFailedException` from `INTERNAL_SERVER_ERROR` to `GONE` (410) and gave it a real,
   provokable call site: `SubscriberWorker#enqueueOrThrow` now throws it when a worker has already
   stopped, reachable through a new strict `Broker#publishToSubscriber` point-to-point send path.
5. Verified via `PubSubServiceTest#subscribe_sameIdOnTwoDifferentTopics_isAllowed_andHistoryIsKeptSeparate`
   (asserts each topic's history stays distinct) and
   `#getSubscriberMessages_subscriberOfADifferentTopic_throwsSubscriberNotFoundException` (asserts
   the previously-silent leak now 404s instead), plus `PubSubRepositoryTest#sameSubscriberId_onTwoDifferentTopics_trackedIndependently`
   and `config.DomainExceptionContractTest#noneMapToServerError` (now passes with
   `DispatchFailedException` actually reachable, not just correctly annotated).

### 6. Preventative Measures
1. A repository or cache key must be as specific as the operations that read it — `getSubscriberMessages`
   took a `topicName` argument that implied topic-scoped storage; the cache underneath it should have
   been reviewed for the same scope the moment the method signature was written, not years later
   during an unrelated audit.
2. An unused `@Repository` bean sitting beside a service that duplicates its job by hand (here: a
   local `HashMap` doing what `PubSubRepository` was built to do) is itself a signal worth
   investigating — the duplication is exactly where the two were free to drift, and did.
3. A typed exception with a correct-looking class name and an incorrect `@ResponseStatus` is
   strictly worse than an untyped one: `DomainExceptionContractTest` can only catch a bad status on
   an exception that some code path actually throws. A newly added exception that nothing throws
   yet should be treated as a paper trail promising future work, not evidence the case is handled —
   audit for "declared but unreachable" exceptions the same way you'd audit for dead code, because
   that is exactly what they are.

## RCA-029: ATM's Session-State Check and Transition Ran Outside the Account Lock, Producing an Intermittent Spurious `InvalidSessionStateException` Under Concurrent Withdrawals

**Severity:** Medium (no data corruption — the account balance itself was always correctly
protected by the per-account lock — but a genuine, non-deterministic race that could make a
legitimate concurrent withdrawal fail with a misleading "not authenticated" error, and that a
`@RepeatedTest` concurrency suite could pass or fail by luck depending on scheduling)
**Date:** 2026-08-29
**Status:** Resolved
**Affected:** `com.lld.atm.service.AtmService#withdraw`, `#deposit`, `#getBalance`

### 1. Overview & Severity
Found while doing final verification on the `atm` module's 17-criteria upgrade, after the
build-out agent had already written `AtmConcurrencyTest` and moved on to unrelated polish. Running
the full backend suite twice in the same session produced two different outcomes for the identical
test class: one full run reported it green, the very next full run reported 4–5 errors in it, all
with the same message. Re-running just `AtmConcurrencyTest` in isolation reproduced the failure
deterministically enough to investigate (2 of 3 isolated runs failed), then — after the fix below —
5 consecutive isolated runs all passed clean. That inconsistency (not "always fails," not "always
passes," but "fails often enough to matter and passes often enough to slip through CI by luck") is
the signature of a genuine data race, not a flaky test needing a longer timeout.

### 2. Symptoms & Error Logs
```
com.lld.atm.service.AtmConcurrencyTest.tenConcurrentWithdrawalsOnSameAccount_exactlyOneSucceedsNoOverdraw
  -- ERROR!
java.util.concurrent.ExecutionException: org.opentest4j.AssertionFailedError:
  Unexpected exception racing withdraw(): com.lld.atm.exception.InvalidSessionStateException:
  This operation requires an authenticated session. Current state: DISPENSING
```
Ten threads call `withdraw()` on the same already-authenticated account; several of them see the
terminal's session state as `DISPENSING` — a state some OTHER thread's in-flight withdrawal put it
in — and are rejected outright, instead of either succeeding or failing with the intended
`InsufficientBalanceException`.

### 3. Root Cause
`AtmService` models one physical terminal's session as a handful of plain instance fields
(`currentState`, `activeCard`, `activeAccount`), with a dedicated `sessionLock` that the terminal's
front-facing lifecycle methods (`insertCard`/`authenticate`/`ejectCard`) correctly acquire around
every read and write via `transitionTo()`. `withdraw()` and `deposit()`, however, called
`requireAuthenticatedSessionFor(accountNumber)` — an **unsynchronized read** of `currentState` and
`activeAccount` — and `setState(ATMState.TRANSACTION_IN_PROGRESS)` — an **unsynchronized write** to
`currentState`, by design (its own javadoc explains why it must skip the `transitionTo` table
check) — both **before** acquiring `Account#getLock()`. Only the later `DISPENSING`/back-to-
`AUTHENTICATED` transitions happened while holding that account lock.

That left a window: Thread A takes the account lock and sets the shared `currentState` to
`DISPENSING` mid-transaction; Thread B, not yet blocked on the account lock (or targeting a
different code path that reads state first), reads `currentState` in that exact window, sees
`DISPENSING` — not in `requireAuthenticatedSessionFor`'s allowed set of
`{AUTHENTICATED, TRANSACTION_IN_PROGRESS}` — and throws, even though the session genuinely is still
authenticated; it just happens to be mid-transaction on a *different* thread's call.

### 4. Diagnostic Commands
```bash
# Reproduce: run the concurrency suite in isolation, repeatedly — a single run can pass by luck.
cd backend && for i in 1 2 3; do mvn -q -o test -Dtest='com.lld.atm.service.AtmConcurrencyTest'; echo "run $i exit: $?"; done

# Confirm the unsynchronized read/write shape before the fix:
grep -n "requireAuthenticatedSessionFor\|setState(ATMState.TRANSACTION_IN_PROGRESS)\|acc.getLock().lock()" \
  backend/src/main/java/com/lld/atm/service/AtmService.java
```

### 5. Step-by-Step Resolution
1. Moved the `requireAuthenticatedSessionFor(accountNumber)` call and the initial
   `setState(ATMState.TRANSACTION_IN_PROGRESS)` transition to run **inside** `acc.getLock()`'s
   critical section in both `withdraw()` and `deposit()`, immediately after acquiring the lock —
   not before it.
2. Applied the same fix to `getBalance()`, a narrower but real instance of the identical shape (a
   read-only balance query racing a concurrent withdrawal's `DISPENSING` window could spuriously
   reject a legitimately-authenticated caller).
3. Re-ran `AtmConcurrencyTest` in isolation 5 consecutive times post-fix — all green — then the full
   backend suite once more to confirm no other test depends on the old ordering.

### 6. Preventative Measures
1. General rule this module now demonstrates directly: when a method both (a) checks/mutates
   session-scoped state shared across concurrent callers and (b) acquires a narrower per-entity
   lock for the actual mutation, the session check must happen **inside** the narrower lock, not
   before it — "acquire the lock, then check" is the only order safe from concurrent interleaving,
   even when the check feels like it "obviously" belongs first as a fast-fail guard.
2. A concurrency test that passes on one run is not evidence of correctness by itself — this bug
   was found precisely because the *same* test class gave two different verdicts across two
   back-to-back full-suite runs. Any concurrency-proving test in this repo should be treated with
   the same suspicion this repo's own `AtmConcurrencyTest` earned: re-run it several times in
   isolation, not just once, before trusting a green result — especially right after writing it or
   changing the code it exercises.
3. This exact bug shape (a lock guards the *mutation* but not the *precondition check* that gates
   entry to it) is worth grepping for across other modules that combine a session/state check with
   a per-entity lock — it will not show up as a compile error or even a single-run test failure,
   only as an intermittent one.

## RCA-030: A 45-Module Sequence-Diagram Commit Was Pushed Directly to `main`, Bypassing PR Review, and Several of Its Diagrams Described Code That Doesn't Exist

**Severity:** Medium (no runtime impact — this is documentation content, not application code, and
`designDataCoverage.test.js` still passed because it only checks structural registration, never
content accuracy — but this repo's sequence diagrams exist specifically to show *how the real code
actually behaves*; fabricated ones actively mislead a reader instead of just being incomplete)
**Date:** 2026-08-29
**Status:** Partially resolved — the modules verified in this pass are fixed; a full audit of the
remaining sequence diagrams from the same commit has not been done (see Preventative Measures)
**Affected:** `frontend/src/data/sequences/{atm,library,shoppingcart,hotel,cricinfo,course-registration,music-streaming,car-rental,blocking-queue,stackoverflow}.js`; the commit itself touched 32 sequence files across the whole portfolio

### 1. Overview & Severity
A commit titled `feat(sequences): complete 45-module sequence diagram coverage across entire
portfolio` landed on `main` as commit `2f1d52e` with **no branch, no PR, and no CI run** —
confirmed via `git log --format="%P"` showing it as a single-parent commit directly on `main`, and
`gh pr list --search "sequences"` returning no matching PR. That alone is a process violation of
this repo's own `CLAUDE.md` ("Never commit to `main`."). The bigger problem surfaced when this
session's own `atm` work — done independently, in an isolated worktree, grounded directly in the
real `AtmService` source — was rebased onto this commit and its `frontend/src/data/sequences/atm.js`
came into direct conflict with the one the bulk commit had generated: the bulk commit's version
described a "Chain of Responsibility" cash-dispenser architecture (`TwoThousandHandler`,
`FiveHundredHandler`, `OneHundredHandler`, a `CashVault` class) that **never existed at any point in
this module's history** — the real pattern is Strategy + Factory
(`DenominationDispenseStrategyFactory`), and neither `CashVault` nor any per-denomination handler
class exists anywhere in `com.lld.atm`.

### 2. Symptoms & Error Logs
No test failure — this is the core danger. `mvn test`, `npx vitest run`, and
`designDataCoverage.test.js`'s 291 structural checks (every id resolves, no duplicate barrel keys,
no diagram edge pointing at an undeclared class) all passed against the fabricated content, because
none of them read the Java source and compare it to the diagram's prose/class names. The only way
this surfaced was a human-directed spot-check request ("go through all the sequence diagrams and
verify them if they are correct") followed by manually cross-referencing each diagram's referenced
class names against `find backend/src/main/java -name "<ClassName>.java"`.

### 3. Root Cause
Two independent failures compounded:
1. **Process**: pushing directly to `main` skipped the one mechanism (PR review, even automated)
   that could have caught this before it became "the truth on `main`" for every subsequent branch
   to rebase onto.
2. **Content generation**: sequence diagrams for this session's actively-verified modules (pubsub,
   parking, ludo, taskmanagement, auction, digitalwallet, socialnetwork, airline, elevator) were all
   written by an agent that had just spent an entire task reading and hardening that module's real
   source — grounded by construction. This bulk commit instead generated 32 diagrams in one pass for
   modules the same session hadn't just been reading, and the failure rate tracked that: a spot
   check across 22 of the 32 touched modules found **3 severely fabricated** (invented an entire
   architecture that doesn't exist: `atm`'s Chain of Responsibility, `library`'s reservation queue +
   `FineCalculationStrategy`, `shoppingcart`'s `DiscountStrategy`/`DiscountStrategyFactory`) and
   **7 with smaller but real naming errors** (`hotel`'s invented `SeasonalTariffStrategy`,
   `cricinfo`'s `CricInfoService` casing + fabricated `ScorecardNotifier`, `course-registration`'s
   `CourseRepository` shorthand, `music-streaming`'s `MusicRepository` shorthand, `car-rental`'s
   `CarUnavailableException`, `stackoverflow`'s `UserRepository`, `blocking-queue`'s
   `ConcurrencyRunService`) — a **~45% inaccuracy rate** in the sample checked. The other 11 sampled
   modules (`movieticket`, `chess`, `concert-ticket`, `inventory`, `linkedin`, `restaurant`,
   `vendingmachine`, `coffee`, `logging-framework`, `lru-cache`, `minesweeper`, `snakeladders`,
   `stock-brokerage`, `tictactoe`, `traffic-signal`) checked out clean, so this was not a uniform
   failure — it tracked specifically with whichever modules had NOT just had their real service code
   read in the same working session.

### 4. Diagnostic Commands
```bash
# Confirm a commit is a direct push, not a squash-merged PR: single parent, no matching PR.
git log -1 <sha> --format="%H %P"
gh pr list --state merged --search "<keyword from the commit title>"

# Batch-check a sequence file's referenced class names against the real codebase — the fast,
# scalable way to catch fabrication without fully reading each diagram:
grep -oE "\b[A-Z][a-zA-Z]{3,}(Service|Strategy|Factory|Repository|Exception|Controller|Observer|Notifier|Handler|Manager)\b" \
  frontend/src/data/sequences/<module>.js | sort -u
# then, for each name found:
find backend/src/main/java -name "<ClassName>.java"   # empty result = likely fabricated
```

### 5. Step-by-Step Resolution
1. Ran the batch class-name-existence check above across a 22-module sample of the 32 files the
   bulk commit touched.
2. For `atm`: no separate fix needed — this session's own from-scratch, code-grounded
   `sequences/atm.js` (written in an isolated worktree, from `AtmConcurrencyTest`) simply won the
   merge conflict when rebased onto `main`.
3. For `library` and `shoppingcart` (the two other severely fabricated files): read the real service
   methods (`LibraryService#borrowBook`/`#returnBook`, `ShoppingCartService#placeOrder`) end to end
   and rewrote both diagrams from scratch around the *actual* locking/exception/pattern shape —
   `library`'s real two-lock (member-then-book) last-copy-contention race and
   `StandardFineStrategy`'s real ₹5/day math; `shoppingcart`'s real ascending-product-ID lock
   ordering (the same idiom `digitalwallet` uses) plus its idempotency-key retry cache, neither of
   which the fabricated version mentioned at all despite being the module's actual interesting
   concurrency story.
4. For the 7 smaller-inaccuracy files: mechanical name corrections only (e.g.
   `CricInfoService`→`CricinfoService`, `ScorecardNotifier`→`MatchPublisher`,
   `CarUnavailableException`→`VehicleNotAvailableException`) — the surrounding flow structure in
   those was already accurate.
5. Ran `npx vitest run` (304/304) and `npm run build` (entry chunk unchanged) after every edit.

### 6. Preventative Measures
1. **Never push directly to `main`, including for "just documentation" changes** — the branch/PR/CI
   path is what would have caught this, even without a human reviewer, simply by forcing someone
   (or some future rebase) to look at the diff before it became load-bearing truth for every other
   branch. This applies exactly as much to `frontend/src/data/**` content files as to backend code.
2. A sequence diagram's own file-header comment claiming "Grounded directly in `X`, `Y`, `Z`" is not
   evidence that it is — the fabricated `atm.js` and `library.js` both opened with exactly that
   phrasing. Trust the class-name-existence grep, not the comment.
3. **The remaining ~10 of the 32 modules this bulk commit touched have not been individually
   verified** (only sampled — `bloom-filter`, `concurrent-hashmap`, `fizz-buzz`, `foo-bar`, `h2o`,
   `merge-sort`, `zero-even-odd`, `ttl-cache` were skipped because they referenced no class-name-like
   identifiers to check mechanically, and a few others may not have been sampled at all). Run the
   diagnostic-command batch check above across the full list before trusting them, or re-generate
   each one the same way this session's per-module upgrade passes did: written by whoever most
   recently read that module's real service code, not in a single detached bulk pass.
4. Generating any content (diagrams, design docs, API examples) about a module's real patterns is
   exactly as fabrication-prone as generating code, and deserves the same grounding discipline: read
   the actual class before naming it, and prefer generic textbook-shaped naming ("a Notifier", "a
   Repository") as an honest placeholder over a specific invented class name that reads as real.

## RCA-031: Stock Brokerage's `OrderExecutionException` Was Dead Code, and Wiring It Up for Self-Trade Prevention Would Have Leaked the Order's Fund/Share Reservation on Every Rejection

**Severity:** Medium (no live-code impact yet — `OrderExecutionException` was never thrown before
this pass, so no user-facing bug existed on `main`; but the reservation-leak this RCA describes
would have shipped as a real, permanent-money-stuck bug in the very same commit that added the
feature meant to fix a different gap, had it not been caught before merge)
**Date:** 2026-08-29
**Status:** Resolved
**Affected:** `com.lld.stockbroker.strategy.OrderExecutionStrategy#guardSelfTrade` (new),
`com.lld.stockbroker.service.StockBrokerService#placeOrder`, `#simPlaceOrder`

### 1. Overview & Severity
Auditing `stock-brokerage` against the repo's 17-criteria bar (it had never had a recorded
`/audit-lld` pass) found six concrete subclasses of `StockBrokerException`, one of which —
`OrderExecutionException`, `@ResponseStatus(UNPROCESSABLE_ENTITY)` — was never constructed
anywhere in the codebase. `DomainExceptionContractTest`/`GlobalExceptionHandlerTest` only check
that every *declared* exception maps to a non-5xx status; neither test (nor any other guard-rail
suite) can detect that a declared exception is never actually thrown, so this had shipped silently
since the module was first built. The fix — real, provokable self-trade prevention (a top-of-book
check rejecting an order that would match the placing account's own resting counter-order) — is
what surfaced the second, more serious issue below while still in the same working session, before
any commit landed.

### 2. Symptoms & Error Logs
No test failure triggered this — it was caught by manually tracing what happens to
`StockBrokerService#placeOrder`'s pre-check reservation (step 1: `account.reserveFunds(...)` for a
BUY, or `account.getPortfolio().reserveShares(...)` for a SELL) if the strategy's `execute()` call
in step 3 throws *after* that reservation has already succeeded. Before this pass, nothing in
`OrderExecutionStrategy#execute()` could ever throw past that point — the method only returned a
(possibly empty) `List<Trade>`. Adding `guardSelfTrade()` as the first statement inside `execute()`
made that assumption false: an `OrderExecutionException` now legitimately fires *after* the caller
has already committed the reservation, and the original `placeOrder`/`simPlaceOrder` code had no
`catch` block that would ever release it.

### 3. Root Cause
`placeOrder`'s reservation step and its matching-under-lock step were written as two sequential,
un-linked blocks:
```java
if (side == OrderSide.BUY) {
    account.reserveFunds(requiredFunds);          // (1) commits the reservation
} else {
    account.getPortfolio().reserveShares(sym, quantity);
}
...
lock.lock();
try {
    strategy.execute(order, book, accounts, stock); // (2) previously could not throw past here
} finally {
    lock.unlock();
}
```
The only exceptions either statement was ever documented (or observed) to throw were
`InsufficientFundsException`/`InsufficientStockException` from step (1) itself — thrown *before*
any reservation is committed, so there was never anything to release. Once step (2) gained a real
failure mode of its own, that reservation became orphaned on every rejection: `reservedBalance`
(or a `Holding`'s `reservedQuantity`) would be permanently incremented with no corresponding
release, silently shrinking the account's `getAvailableBalance()`/`getAvailableQuantity()` forever
— indistinguishable from real money/shares that had simply vanished, for every self-trade attempt
a user made. `simPlaceOrder` had the identical shape one level down (its own `try`/`catch
(Exception e)` around the whole order lifecycle logs `ORDER_FAILED` but never released anything
either).

### 4. Diagnostic Commands
```bash
# Confirm OrderExecutionException was never thrown before this pass (only declared):
grep -rn "new OrderExecutionException" backend/src/main/java/com/lld/stockbroker/

# Trace every path that can call Account#reserveFunds / Portfolio#reserveShares without a
# corresponding release*/settle* on every exit, including exceptional ones:
grep -n "reserveFunds\|reserveShares\|releaseReservedFunds\|releaseReservedShares" \
  backend/src/main/java/com/lld/stockbroker/service/StockBrokerService.java
```

### 5. Step-by-Step Resolution
1. Implemented `guardSelfTrade(order, book)` as a `default` method on `OrderExecutionStrategy`
   (shared by both `MarketExecutionStrategy`/`LimitExecutionStrategy`, called as the first
   statement in each `execute()`), throwing `OrderExecutionException` when the best available
   counter-price on the opposite side of the book belongs to the placing account.
2. Wrapped the matching call in both `placeOrder` and `simPlaceOrder` in a `catch
   (OrderExecutionException ex)` block that releases exactly the reservation step (1) committed
   (`releaseReservedFunds(requiredFunds)` for a BUY, `releaseReservedShares(sym, quantity)` for a
   SELL) and sets the order's status to `REJECTED` before rethrowing (`placeOrder`) or letting the
   outer catch log it (`simPlaceOrder`) — mirroring the release logic `cancelOrder` already used
   for an unexecuted remainder.
3. Added `StockBrokerServiceTest#testSelfTradePreventionReleasesReservation`, which places a
   self-crossing order and asserts the account's `getAvailableBalance()` is back to its pre-attempt
   value after the exception — this is the regression test that would have caught the leak had it
   shipped.

### 6. Preventative Measures
1. **A method that has never thrown past a given point is not guaranteed to keep that property**
   — every future strategy/matching change in this file must re-audit whether the reservation
   release still covers every new exceptional exit, not just the ones that existed when the
   original reserve/release pairing was written.
2. Whenever a "reserve, then do the risky thing, then settle" shape gains a new failure mode
   between reserve and settle, grep for every `reserve*` call in the surrounding service and
   confirm each has a `release*`/`settle*` on **every** exit path, exceptional included — the same
   discipline this repo's other modules apply to lock acquisition (`try`/`finally` unlock) applies
   equally to reservation accounting, and the failure mode (a silently shrinking available balance)
   is just as hard to notice in production as a stuck lock is.
3. A declared-but-never-thrown exception in this codebase is not necessarily harmless dead code to
   simply delete — it can be a genuine missing feature (self-trade prevention, here) whose real
   implementation surfaces its own new correctness requirements. Treat `grep -rn "new
   <ExceptionName>"` returning nothing as a prompt to ask "should this be thrown, and if so, what
   does wiring it up actually require upstream?" before assuming the fix is to remove the class.

## RCA-032: Shopping Cart's `UpdateQuantityCommand#undo()` Could Not Restore a Line Item After Its Quantity Was Dropped to Zero

**Severity:** Medium (Undo silently no-oped instead of restoring the cart, in exactly the case a
shopper is most likely to trigger — dropping a quantity to 0 and immediately regretting it)
**Date:** 2026-08-29
**Status:** Resolved
**Affected:** `com.lld.shoppingcart.command.UpdateQuantityCommand`, `com.lld.shoppingcart.service.ShoppingCartService#updateCartQuantity`

### 1. Overview & Severity
Auditing the shopping-cart module's Command pattern against the reference bar (per this session's
task to verify `undoLastCartCommand()` "actually reverses the last command's effect correctly,
including for `UpdateQuantityCommand`") surfaced a real correctness bug rather than confirming the
existing behavior. `UpdateQuantityCommand` originally captured only the previous **quantity** as a
bare `int`. `Cart#updateQuantity(productId, quantity)` treats `quantity <= 0` as a removal — it
calls `items.remove(productId)`. When a shopper dropped a line item's quantity to 0 (removing it)
and then hit Undo, `undo()` replayed `cart.updateQuantity(productId, oldQuantity)` — but
`Cart#updateQuantity`'s `quantity > 0` branch only ever mutates an **already-present** map entry
(`if (item != null) { item.setQuantity(quantity); }`); it has no way to reconstruct a removed
entry from a bare `productId` + `quantity`, since it never learns the product's name or price. The
undo silently no-oped: no exception, no error, the item just stayed gone.

### 2. Symptoms & Error Logs
No test in the pre-audit suite (`ShoppingCartServiceTest`, the module's only test file at the time)
exercised an update-to-zero-then-undo sequence — every existing undo test only ever undid an
`AddItemCommand`. The bug was found by hand-tracing `UpdateQuantityCommand`/`Cart#updateQuantity`
while writing new command unit tests, then confirmed with a failing test:
```
updateQuantityCommand_undoAfterQuantityDroppedToZeroRestoresOriginalLineItem():
  expected: not <null>
  but was:  <null>
    at CartCommandTest.updateQuantityCommand_undoAfterQuantityDroppedToZeroRestoresOriginalLineItem
```

### 3. Root Cause
```java
// UpdateQuantityCommand, before the fix
public class UpdateQuantityCommand implements CartCommand {
    private final int oldQuantity;   // <-- only the number, not the item itself
    ...
    @Override
    public void undo() {
        cart.updateQuantity(productId, oldQuantity);   // no-ops if execute() removed the entry
    }
}
```
```java
// Cart#updateQuantity -- unchanged, and correct for its own contract
public void updateQuantity(String productId, int quantity) {
    if (quantity <= 0) {
        items.remove(productId);
    } else {
        CartItem item = items.get(productId);
        if (item != null) {           // <-- silently does nothing if the entry is already gone
            item.setQuantity(quantity);
        }
    }
}
```
`Cart#updateQuantity` is correct for what it promises (update an existing item, or remove one) —
the bug was entirely in `UpdateQuantityCommand` discarding information (the full previous line
item) it needed to reverse its own effect, and in
`ShoppingCartService#updateCartQuantity` only ever having fetched an `int` from the `CartItem` it
already held a reference to.

### 4. Diagnostic Commands
```bash
# Reproduce directly against the command, no service/HTTP layer needed:
cd backend && mvn -o -q test -Dtest='com.lld.shoppingcart.command.CartCommandTest#updateQuantityCommand_undoAfterQuantityDroppedToZeroRestoresOriginalLineItem'

# Confirm Cart#updateQuantity's own contract (never mutates a missing entry) is intentional,
# not itself a bug, before "fixing" the wrong class:
grep -n "quantity <= 0" backend/src/main/java/com/lld/shoppingcart/model/Cart.java
```

### 5. Step-by-Step Resolution
1. Changed `UpdateQuantityCommand`'s constructor to take a `CartItem previousSnapshot` (the full
   line item as it was immediately before this command's `execute()`, or `null` if the product
   wasn't in the cart at all) instead of a bare `int oldQuantity`.
2. Rewrote `undo()`: if the line item is still present (the common case — `execute()` only changed
   its quantity), restore the quantity in place via `cart.updateQuantity`. If the entry is missing
   (execute() dropped it to 0), reinsert a fresh `CartItem` built from `previousSnapshot` directly
   into `cart.getItems()`, since `Cart#updateQuantity` cannot do that resurrection itself.
3. Updated `ShoppingCartService#updateCartQuantity` to snapshot the full `CartItem` (not just its
   quantity) before constructing the command, mirroring the object it already held a reference to.
4. Added `CartCommandTest`, exercising all three commands directly (bypassing the service), with
   explicit cases for: a normal quantity restore, restore after dropping to 0, and undo when the
   product was never in the cart at all (`previousSnapshot == null`).
5. Re-ran the full shopping-cart suite (`mvn -o -q test -Dtest='com.lld.shoppingcart.**'`) to
   confirm the existing `ShoppingCartServiceTest` (which only exercised the non-zero-drop path)
   still passed unchanged.

### 6. Preventative Measures
1. A Command whose `undo()` needs to reconstruct state that its paired mutator method
   (`Cart#updateQuantity`) cannot itself resurrect must capture that state at construction time —
   capturing only the minimum data needed for the *forward* operation (a bare `int` quantity) is
   not enough data to guarantee the *reverse* one, even when the forward operation looks
   symmetric. `AddItemCommand`/`RemoveItemCommand` were already correct on this point (they hold a
   `Product`/`CartItem` reference, not just an id or count) — `UpdateQuantityCommand` was the one
   command that took a shortcut.
2. This is exactly the kind of gap a "confirm each command really reverses its effect" audit test
   catches and a happy-path-only suite cannot: the pre-audit suite's only undo test undid an
   `AddItemCommand`, so `UpdateQuantityCommand#undo()` had never actually been exercised at all,
   let alone its edge case. Any `CartCommand`-style Undo implementation in this repo should carry a
   direct unit test per command (not just one integration-style "undo works" test through the
   service) covering both its normal path and whatever edge case makes its forward operation
   destructive (here: quantity dropping to/through zero).

## RCA-033: Shopping Cart's Idempotency-Key Cache Had an Unguarded Check-Then-Act That Let Concurrent Retries Double-Charge

**Severity:** High (the entire point of an idempotency key is "never double-charge on retry," and
under real concurrency it could — stock was decremented twice and payment was charged twice for
what the client believed was a single logical order)
**Date:** 2026-08-29
**Status:** Resolved
**Affected:** `com.lld.shoppingcart.service.ShoppingCartService#placeOrder`

### 1. Overview & Severity
While writing the concurrency test this session's audit explicitly asked for ("test the
idempotency-key path... does not decrement stock or charge payment a second time"), a second,
stronger test was added beyond the literal sequential-retry case: many threads calling
`placeOrder` concurrently with the SAME idempotency key, simulating a client that fires a retry
before the first request's response has come back (the actual scenario an idempotency key exists
to protect against — RCA-032's own sequence diagram narrative describes exactly this: "the
client's HTTP call times out and retries with the SAME key"). That test failed on the very first
run, proving the cache was not safe under the concurrency it was designed for.

### 2. Symptoms & Error Logs
`ShoppingCartConcurrencyTest#concurrentRetriesWithSameIdempotencyKeyStillChargeExactlyOnce` (12
threads, one `CountDownLatch`-released, all calling `placeOrder` with the identical idempotency key
against the same 1-item cart):
```
org.opentest4j.AssertionFailedError: Every concurrent retry must resolve to the SAME cached order
 ==> expected: <Order(orderId=ORD-100, ... totalAmount=10.0, paymentTransactionId=TX-1, ...)>
     but was:  <Order(orderId=ORD-101, ... totalAmount=0.0, paymentTransactionId=TX-2, ...)>
```
Two distinct orders were created from a single logical checkout: `paymentTransactionId=TX-1` and
`TX-2` prove the payment strategy was invoked twice, and `ORD-101`'s `totalAmount=0.0` (rather than
the cart's real 10.0) shows the second thread's checkout raced `cart.clear()` from the first and
computed its total against an already-emptied cart.

### 3. Root Cause
```java
// placeOrder(), before the fix
public Order placeOrder(String userId, PaymentMethod paymentMethod, String idempotencyKey) {
    if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
        Order cached = idempotencyCache.get(idempotencyKey);   // CHECK
        if (cached != null) {
            return cached;
        }
    }
    // ... lock products, validate stock, decrement stock, charge payment ...
    idempotencyCache.put(idempotencyKey, order);                // ACT (much later)
    return order;
}
```
The cache read and the cache write were two independent, unsynchronized `ConcurrentHashMap`
operations separated by the entire checkout body (product locking, stock decrement, payment). Two
threads racing with the same key could both read `null` from the cache before either had written
to it, so both proceeded to do the full checkout independently — the per-product `ReentrantLock`
correctly serialized their stock decrements against EACH OTHER (no negative stock, no lost
update), but it does nothing to prevent the checkout from running *twice*. The last writer's
`Order` silently overwrote the first's in `idempotencyCache`, so the client's original response and
the cache's eventual content could even disagree about which `Order` "the" idempotent result was.
This was a classic check-then-act race on a shared cache, structurally the same shape as RCA-027's
(parking lot's `payAndExit` double-pay bug) and RCA-024's — a re-validation gap this repo has now
hit three times in three different modules, always in the "read a cache/status, act on it much
later" shape.

### 4. Diagnostic Commands
```bash
# Reproduce directly:
cd backend && mvn -o -q test -Dtest='com.lld.shoppingcart.ShoppingCartConcurrencyTest#concurrentRetriesWithSameIdempotencyKeyStillChargeExactlyOnce'

# Find the same "read a cache, act on it later, write the cache" shape elsewhere in this repo:
grep -rn "idempotencyCache.get\|idempotencyCache.put" backend/src/main/java/com/lld/*/service/*.java
```

### 5. Step-by-Step Resolution
1. Added `idempotencyKeyLocks: ConcurrentHashMap<String, Object>`, lazily populated via
   `computeIfAbsent` — one monitor object per idempotency key, never shared across keys, so
   requests under different keys (the overwhelming common case: most checkouts don't collide on a
   key at all) still run fully concurrently.
2. Wrapped the entire "check cache -> do the checkout -> populate cache" sequence in
   `synchronized (keyLock)` when a key is present, moving the cache write to immediately follow the
   checkout inside the same critical section rather than as a late side effect deep inside the
   (now-extracted) checkout body.
3. Extracted the actual checkout logic (product locking, stock validation/decrement, payment, order
   creation) into a private `doPlaceOrder(userId, paymentMethod)` with no idempotency awareness at
   all, called once for the no-key path (unchanged, fully concurrent as before — this is what the
   opposite-insertion-order deadlock-freedom test exercises) and once from inside the key-lock's
   critical section for the with-key path.
4. While in the same method, also fixed a related smell noticed alongside the race: `totalAmount`
   was computed via a fresh `cart.getTotalAmount()` read positioned *after* the stock decrement but
   *before* `cart.clear()` — itself vulnerable to reading a concurrently-mutated live `Cart` object
   (exactly what produced the `totalAmount=0.0` in the failure above). Changed it to sum the
   already-built `orderItems` snapshot instead, which cannot be affected by what any other thread
   does to the shared `Cart` afterward.
5. Re-ran `concurrentRetriesWithSameIdempotencyKeyStillChargeExactlyOnce` (now passing: exactly one
   `paymentCalls` invocation and exactly one stock decrement across 12 racing threads), then the
   full `com.lld.shoppingcart.**` suite to confirm the opposite-order deadlock-freedom test and
   every other existing test still passed unchanged.

### 6. Preventative Measures
1. An idempotency cache is only as strong as the atomicity of its check-then-act sequence — a
   `ConcurrentHashMap` being individually thread-safe per operation says nothing about two
   operations against it separated by arbitrary work in between. The correct primitive is a
   per-key lock (or `computeIfAbsent`-with-a-supplier-that-does-the-work, if the work can safely
   run inside the map's own internal lock — it can't here, since `doPlaceOrder` itself acquires
   other locks and calls out to a payment strategy, and doing that inside
   `ConcurrentHashMap#computeIfAbsent`'s callback risks the same nested-locking hazards
   `WalletRepository`'s known constraint against calling back into the map from inside
   `compute`/`computeIfAbsent` already documents elsewhere in this repo).
2. This is the third time this repo has hit a check-then-act race with the same shape (read
   status/cache → act → write status/cache, with real work in between): RCA-024 (airline seat
   status), RCA-027 (parking lot payment status), now this. Any method in this codebase that reads
   a piece of mutable state, decides whether to proceed based on it, and only writes the "I already
   did this" marker at the very end needs either (a) the read-decide-write to happen under one lock
   held the whole time, or (b) an atomic map primitive (`computeIfAbsent`,
   `compute`) that makes the decision and the write indivisible — never a plain `get()` followed by
   a `put()` arbitrarily far down the method.
3. A concurrency test that only exercises *sequential* retries (call, then call again) cannot catch
   this class of bug — it always passes, because there is no window for two calls to race the same
   check. Any idempotency-key or "retry-safe" claim in this repo's design docs should be backed by
   a genuinely concurrent test (multiple threads, `CountDownLatch`-released, same key), not just a
   sequential one, exactly as `ShoppingCartConcurrencyTest` now does.
