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

## RCA-034: The Remaining 10 Never-Sampled Sequence Diagrams From RCA-030 Were Also Fabricated, Plus Two Files Marked "Clean" in That Original Spot-Check Weren't

**Severity:** Medium (same class as RCA-030/RCA-031 — documentation content, not application code,
so no runtime impact, but actively misleading to a reader trying to learn the real design)
**Date:** 2026-08-30
**Status:** Resolved for the 12 files below; the rest of the 45-module sequence set is now fully
sampled across RCA-030 + RCA-031 + this entry
**Affected:** `frontend/src/data/sequences/{bloom-filter,concurrent-hashmap,merge-sort,ttl-cache,fizz-buzz,foo-bar,h2o,zero-even-odd,cricinfo,logging-framework}.js`

### 1. Overview & Severity
RCA-030's own Preventative Measures section named 8 files as never sampled at all (`bloom-filter`,
`concurrent-hashmap`, `fizz-buzz`, `foo-bar`, `h2o`, `merge-sort`, `zero-even-odd`, `ttl-cache`) and
flagged "a few others" as possibly unsampled too. Running the diagnostic grep across every one of
the 45 sequence files (not just the previously-skipped 8) turned up two more that RCA-030's original
22-module spot-check had marked clean but weren't: `cricinfo` (invented a `MatchEngine` class; the
real one is `BallRecordingEngine`) and `logging-framework` (invented a `LogLevelFilter` chain-of-
responsibility step; the real chain is `LogHandlerChainBuilder` routing to per-level handlers, and
the real threshold filter is a plain inline comparison in `Logger#log`, not a chain step at all).

All 8 previously-unsampled files turned out fabricated too, but in a way RCA-030's grep pattern was
structurally blind to: they don't reference fictitious class *names* (there's no invented
`XyzService` to catch), they invent a fictitious *architecture* — a live, free-form `put()`/`get()`
demo instead of the real design, which for every primitive in `com.lld.concurrency` is a single
`POST /api/concurrency/<name>/run` that scripts a fixed scenario against real threads and returns a
complete timestamped trace (`RunRequest` → `{Name}Service#run` → `RunResult` with `orderedTrace[]`).
`concurrent-hashmap.js` was the worst of the 8: it showed two threads doing a bare `put()` on
different stripes, when the real `ConcurrentHashMapService#run` scripts two entirely different
phases (concurrent `merge()`-increment conservation, then a `CountDownLatch`-released
`computeIfAbsent()` race) that the two-thread-put diagram didn't depict at all.

### 2. Symptoms & Error Logs
None — same as RCA-030, `designDataCoverage.test.js` only checks structural registration
(id resolves, no duplicate barrel keys, no edge to an undeclared class), never content accuracy
against the Java source, so all 304 frontend tests passed against every fabricated file the whole
time.

### 3. Root Cause
1. RCA-030's diagnostic grep (`\b[A-Z][a-zA-Z]{3,}(Service|Strategy|...)\b` → existence-check each
   match) only catches a *wrong class name*. It has no way to catch a *right-shaped but wrong
   architecture* — a diagram that never names a fictitious class because it never engages with the
   real endpoint/service contract at all, just invents a plausible-looking simpler demo. This is the
   same blind-spot family as RCA-031 (embedded `\n` defeating the regex), but a different flavor:
   here the regex ran fine and found nothing to flag, because there was nothing regex-shaped to find.
2. `cricinfo` and `logging-framework` being wrongly marked "clean" in RCA-030's original spot-check
   confirms that pass was a human/agent skim, not the diagnostic grep run to completion against
   every one of the 22 "checked" files — a name like `MatchEngine` (vs. the real
   `BallRecordingEngine`) or `LogLevelFilter` (vs. the real `LogHandlerChainBuilder`) is exactly what
   the grep is built to catch and would have caught immediately if actually run against these files.

### 4. Diagnostic Commands
```bash
# The RCA-030 grep, run against literally every sequence file this time, not a sample —
# tr -d '\n' first (RCA-031's fix) so embedded newlines in participant labels can't hide a name:
for f in frontend/src/data/sequences/*.js; do
  mod=$(basename "$f" .js)
  classes=$(tr -d '\n' < "$f" | grep -oE '[A-Z][a-zA-Z]{3,}(Service|Strategy|Factory|Repository|Exception|Controller|Observer|Notifier|Handler|Manager|Engine|Processor|Command|Filter|Recorder)' | sort -u)
  missing=""
  while IFS= read -r c; do
    [ -z "$c" ] && continue
    find backend/src/main/java -name "${c}.java" | grep -q . || missing="$missing $c"
  done <<< "$classes"
  [ -n "$missing" ] && echo "=== $mod === MISSING:$missing"
done
# NOTE: this shell's `for x in $multiline_var` does NOT word-split on newlines the way bash does —
# it is zsh, and unquoted expansion doesn't split on $IFS by default. Use `while IFS= read -r`
# reading from a `<<<` heredoc/process-substitution instead, or the loop silently treats the whole
# multi-line variable as one item and never iterates.
```

### 5. Step-by-Step Resolution
1. Ran the grep above against all 45 files (not a sample). It flagged real candidates for 3 files
   (`cricinfo`→`MatchEngine`, `bloom-filter`→`HashEngine`, `logging-framework`→`LogLevelFilter`) after
   filtering out JDK-builtin false positives (`BlockingQueue`, `ArrayBlockingQueue`,
   `ScheduledExecutorService`) and test-method-name false positives (`fansOutToBothObservers` matching
   `...ToBothObserver`, `FineCalculationStrategy`/`DiscountStrategy` appearing only inside this
   session's own explanatory code comments from RCA-030, not the actual diagram content).
2. For those 3 plus the 7 other never-sampled primitives with no name-shaped hook for the grep to
   catch (`concurrent-hashmap`, `merge-sort`, `ttl-cache`, `fizz-buzz`, `foo-bar`, `h2o`,
   `zero-even-odd`), read the real `{Name}Service#run` / primitive model class end to end for each
   and rewrote the diagram from scratch around the actual mechanism: e.g. `h2o.js` was missing an
   entire layer — the real `H2OBonder` throttles with TWO semaphores (`hydrogenSemaphore`: 2 permits,
   `oxygenSemaphore`: 1 permit) in front of the `CyclicBarrier(3)`, which the old diagram didn't
   depict at all; `fizz-buzz.js` claimed Semaphore-based coordination through an invented
   "Coordinator" class, when the real `FizzBuzzPrinter` is one shared `ReentrantLock`+`Condition`
   with four threads awaiting on mutually-exclusive predicates.
3. Ran `npx vitest run` (304/304 passing) and `npm run build` (entry chunk 260.85 kB, unchanged)
   after every file.

### 6. Preventative Measures
1. A class-name-existence grep is necessary but not sufficient for verifying generated documentation
   content — it catches "wrong noun," not "wrong architecture." The only real check for the latter is
   reading the actual service/primitive source for that module before trusting (or writing) a
   diagram about it, exactly as RCA-030's own measure #4 already said — this entry is evidence that
   measure needs to be followed for the *whole* module set, not just the ones a grep flags.
2. All 45 sequence-diagram files have now been individually read against real source at least once
   across RCA-030 + RCA-031 + this entry — there is no more "unsampled" tier left. Any *future* sequence
   diagram added to this repo should be written by whoever most recently read that module's real
   service code (as this session's own per-module upgrade passes already did), never generated in a
   detached bulk pass.
3. This session's shell is zsh, not bash, and unquoted `for x in $multilineVar` does not word-split
   the way it would under bash — this silently produced an empty-seeming diagnostic result the first
   time the RCA-030 grep command above was rerun in this session, until switched to a `while IFS=
   read -r` loop. Anyone reusing RCA-030's diagnostic command in this repo's shell should use the
   `while read` form, not the bash-style `for` loop, or double-check the loop is actually iterating.

## RCA-035: Movie Ticket's `cancelBooking` Had an Unguarded Check-Then-Act, and Its Exception Hierarchy Never Extended `DomainException`

**Severity:** Medium (the exception-contract gap meant every domain failure in this module used a
hand-rolled, inconsistent error body instead of the shared one; the concurrency gap could let a
show's `availableSeats` count drift above its real capacity)
**Date:** 2026-08-30
**Status:** Resolved
**Affected:** `com.lld.movieticket.service.MovieTicketService#cancelBooking`,
`com.lld.movieticket.exception.*`

### 1. Overview & Severity
Auditing `movieticket` against the 17-criteria reference bar (HANDOFF.md's "unverified" list) found
two real defects hiding behind a structurally solid-looking module: a genuine check-then-act
concurrency race in `cancelBooking`, and an exception hierarchy that had never actually been wired
into the shared error contract despite looking like it had one.

### 2. Symptoms & Error Logs
Neither defect produced a visible symptom under this module's own pre-existing tests — the single
`MovieTicketServiceTest` never called `cancelBooking` concurrently, and none of its tests went
through the HTTP layer, so a bare 500 from an unmapped exception was never observed. Both were found
by reading the code against the reference bar's checklist, then confirmed by a new failing test:
```
MovieTicketConcurrencyTest#concurrentCancelOfTheSameBookingOnlyOneSucceeds (pre-fix)
org.opentest4j.AssertionFailedError: exactly one of N concurrent cancels on the same booking should succeed
 ==> expected: <1> but was: <4>
```
4 of 10 racing threads all passed the "not already cancelled" check before any of them wrote
`CANCELLED` back, so 4 threads each added the booking's seat count to `Show#availableSeats`.

### 3. Root Cause
**Concurrency:** `cancelBooking` read `booking.getBookingStatus()`, branched on it, then wrote
`CANCELLED` and incremented `show.availableSeats` — a classic read-decide-write sequence with no
lock around it. `SeatLockManager#cancelBookedSeats` (called at the end of the method) does correctly
take a per-seat lock for the seat-status flip, but that only protects the seats, not the booking's
own status field or the show's counter — two concurrent cancel calls could both pass the status
check before either wrote back, exactly the same TOCTOU shape as RCA-032/033 (shopping cart) and
RCA-024 (airline), just discovered in a fourth module.

**Exception contract:** `MovieTicketException extends RuntimeException` directly (not
`com.lld.config.DomainException`), carried its own hand-rolled `errorCode` string field, and none of
its five concrete subclasses had `@ResponseStatus`. Nothing crashed in practice only because
`MovieTicketController` had its own five local `@ExceptionHandler` methods, each hand-building a
`Map.of("error", e.getErrorCode(), "message", e.getMessage())` body — exactly the per-module,
inconsistent-shape pattern `GlobalExceptionHandler`/`DomainException`/`ErrorResponse` were built to
eliminate (see that class's own javadoc: "airline / library / linkedin / stockbroker threw 27 domain
exceptions that all extended RuntimeException with no status mapping... every one surfaced as a bare
HTTP 500"). This module had simply never been migrated onto that shared contract, so it carried
forward the pre-refactor pattern without anyone noticing, since its local handlers happened to work.

A third defect surfaced only once the first two were fixed and the full suite was run: the new
`com.lld.movieticket.strategy.PricingStrategyFactory` collided on Spring's default bean name with
the pre-existing `com.lld.parkinglot.strategy.PricingStrategyFactory` — the exact same
`ConflictingBeanDefinitionException` shape as RCA-023 (ludo vs. snakeladders) and RCA-025 (airline
vs. parkinglot/carrental), now a fourth occurrence of the identical class-name collision:
```
Caused by: org.springframework.context.annotation.ConflictingBeanDefinitionException: Annotation-specified
bean name 'pricingStrategyFactory' for bean class [com.lld.parkinglot.strategy.PricingStrategyFactory]
conflicts with existing, non-compatible bean definition of same name and class
[com.lld.movieticket.strategy.PricingStrategyFactory]
```

### 4. Diagnostic Commands
```bash
# Reproduce the race directly:
cd backend && mvn -o -q test -Dtest='com.lld.movieticket.MovieTicketConcurrencyTest#concurrentCancelOfTheSameBookingOnlyOneSucceeds'

# Find a domain exception hierarchy that never extends DomainException (invisible to
# DomainExceptionContractTest's classpath scan, so a missing @ResponseStatus goes undetected):
grep -rLn "extends DomainException\|extends [A-Za-z]*Exception" backend/src/main/java/com/lld/*/exception/*.java | xargs grep -l "extends RuntimeException"

# RCA-023's own recommended check, still worth rerunning before adding a new @Component/@Service/
# @Repository class with a generic name like "PricingStrategyFactory" or "PaymentProcessor":
find backend/src/main/java -name '*.java' -exec basename {} \; | sort | uniq -d
```

### 5. Step-by-Step Resolution
1. Added `bookingLocks: ConcurrentHashMap<Long, ReentrantLock>` to `MovieTicketService`, lazily
   populated via `computeIfAbsent` (one lock per booking id, never shared across bookings). Wrapped
   `cancelBooking`'s entire read-check-write-write sequence in that lock.
2. Changed `MovieTicketException` to `extends com.lld.config.DomainException` and made it `abstract`
   (never thrown directly), following `tictactoe.exception.TicTacToeException`'s shape — this keeps
   it out of `DomainExceptionContractTest`'s `BASES` allowlist entirely, since an abstract base never
   needs its own status. Dropped the now-redundant `errorCode` field: `ErrorResponse.code` already
   derives the same information from `getClass().getSimpleName()`.
3. Added `@ResponseStatus` to all five concrete subclasses, matching the exact statuses the removed
   controller handlers already used (so no observable behavior changed): `SeatNotAvailableException`
   409, `HoldExpiredException` 410, `BookingFailedException` 422, `CancellationFailedException` 400,
   `InvalidShowException` 404 — coincidentally identical to `airline`'s analogous exceptions, which
   made a good cross-check.
4. Deleted `MovieTicketController`'s five local `@ExceptionHandler` methods plus its
   `IllegalArgumentException` handler; `GlobalExceptionHandler`'s existing `DomainException` and
   `IllegalArgumentException` handlers now cover all of it. The frontend's error display is a strict
   improvement as a side effect: `apiFetch`'s `body.error || body.message` used to surface the raw
   machine code (e.g. `"SEAT_UNAVAILABLE"`) as the on-screen message; it now surfaces the actual
   human-readable message, since nothing in `MovieTicketPage.jsx` branched on the old code strings.
5. Added the five new mappings to `GlobalExceptionHandlerTest`'s parameterized `domainExceptions()`
   list and `MovieTicketConcurrencyTest#concurrentCancelOfTheSameBookingOnlyOneSucceeds`, then reran
   the full `com.lld.movieticket.**` suite plus `com.lld.config.**` to confirm both.
6. Gave the new factory an explicit bean name — `@Component("movieTicketPricingStrategyFactory")`
   — following `carrental`/`airline`'s existing precedent for this exact class name, and documented
   the collision risk in its javadoc. Ran RCA-023's `find ... basename ... uniq -d` check across the
   whole `backend/src/main/java` tree afterward: several other simple-name duplicates exist
   (`PaymentProcessor`, `SeatLockManager` among them), but only one of each currently has an
   unqualified `@Component` (`concertticket`'s) — no *active* second collision today, just the same
   latent fragility RCA-023/025 already flagged, left as-is since fixing a module nothing asked about
   is out of scope for this pass.
7. Re-ran the full `mvn -o -q test` suite (1606+ tests) to confirm `ErrorContractIntegrationTest` and
   every other module's suite passed together, with zero unrelated regressions.

### 6. Preventative Measures
1. Same lesson as RCA-032/033: any check-then-act on a shared mutable field (a status enum, a
   counter) needs either a lock held across the whole read-decide-write, or an atomic map primitive
   — never a plain read followed by a write with real work in between. Four modules have now hit
   this exact shape; it is worth grepping for "read a `getXxxStatus()`, branch, write it back much
   later" across the remaining unaudited modules before assuming it's fixed everywhere.
2. A module whose exception hierarchy extends bare `RuntimeException` instead of `DomainException`
   is invisible to `DomainExceptionContractTest`'s classpath scan — the guard-rail that exists
   specifically to catch a forgotten `@ResponseStatus` cannot catch a hierarchy it never sees in the
   first place. A working local `@ExceptionHandler` in the controller can mask this gap indefinitely,
   since the module never actually 500s — it just silently duplicates the shared contract instead of
   using it. Worth a one-time repo-wide check: `grep -rLn "extends DomainException" backend/src/main/java/com/lld/*/exception/*Exception.java`
   against every module's base exception file, not just the ones already known to be on the
   contract.
3. This is the fourth time a generically-named Strategy/Factory/Manager class has collided on
   Spring's default bean name across modules (RCA-023, RCA-025, now this). `ReorderStrategyFactory`-
   shaped classes keep getting copied into new modules under the same generic name without a glance
   at whether that exact name already exists elsewhere in `com.lld.*` — any new `@Component`/
   `@Service`/`@Repository` class should default to an explicit, module-prefixed bean name rather
   than relying on the decapitalized-simple-name default, especially for common LLD vocabulary
   (`PaymentProcessor`, `PricingStrategyFactory`, `SeatLockManager`, `Notifier`...) that many modules
   independently reinvent.

## RCA-036: LinkedIn's Class Diagram and Design Details Described an Entirely Different, Fictional Module

**Severity:** High (not a wrong detail within the right architecture, like every prior sequence-
diagram fabrication — the whole documented domain was invented; a learner reading it would come
away believing this module implements a social-media feed, which it does not)
**Date:** 2026-08-30
**Status:** Resolved
**Affected:** `frontend/src/data/diagrams/linkedin.js`, `frontend/src/data/design/linkedin.js`

### 1. Overview & Severity
While updating linkedin's design docs to reflect the repository-extraction/DI/Lombok pass this
session was already making (mirroring movieticket's RCA-035 and library's structural pass), the
class diagram and most of the design-details file turned out to describe a completely different
application: a `Post`/`Comment`/`FeedService`/`NotificationService`/`FeedRankingStrategy` social
feed clone. `com.lld.linkedin` has no feed, no post, no comment, no like/share anywhere in it — the
real module is a professional-network domain (`User`/`Profile`/`Connection`/`Message`/
`JobPosting`) with canonical pair-locked connection requests, 1st-degree-gated direct messaging,
and weighted user/job search ranking. This is qualitatively worse than RCA-030/031/034's sequence-
diagram fabrications, which invented a wrong class name or endpoint shape *within* the correct
domain — this invented the domain itself.

### 2. Symptoms & Error Logs
No test failure — `designDataCoverage.test.js` only checks structural integrity (no duplicate
barrel keys, every relationship edge points at a class declared in the same file, every referenced
module id resolves), not whether the content is *true*. A structurally self-consistent but entirely
fictional file passes that suite every time, exactly like RCA-030's original sequence-diagram
fabrications did. Found only by a human-shaped check: reading the class diagram side-by-side with
the real `com.lld.linkedin.service.LinkedInService` while writing an accurate update to it.
```
// diagrams/linkedin.js (before) — classes that do not exist anywhere in the codebase:
{ name: 'Post', fields: ['- author: User', '- content: String', '- likes: int', ...] }
{ name: 'FeedService', methods: ['+ generateFeed(user): List<Post>', ...] }
// design/linkedin.js (before) — patterns for classes that do not exist:
{ name: 'Factory', explanation: 'PostFactory creates different post types (TextPost, ImagePost, VideoPost, ArticlePost)...' }
{ name: 'Singleton', explanation: 'FeedService, NotificationService, and ConnectionService are singletons...' }
```
```bash
$ grep -rn "class Post\|class FeedService\|class Comment" backend/src/main/java/com/lld/linkedin/
# no output — none of these classes exist
```

### 3. Root Cause
Unknown provenance — unlike RCA-030 (a single bulk, un-reviewed commit that fabricated all 45
sequence diagrams at once, traceable to one bad process), these two files show no similar single
smoking gun in isolation. The most telling clue is that `design/linkedin.js`'s `tldr`, `tradeoffs`,
and `solid` sections (further down the same file) were **already accurate** — they correctly
described canonical pair locking, the weighted search strategies, and `CopyOnWriteArrayList`
observer lists, all of which are real. Only `requirements`/`entities`/`designPatterns`/
`principles`/`oopConcepts`/`extensibility` were fictional. This split strongly suggests the file was
assembled from two different sources at two different times — one pass genuinely grounded in the
real service, another pass (perhaps an earlier draft written before the real module existed, or a
generic "professional network" template never reconciled against the actual code) supplying the
entity/pattern sections — and the two were never cross-checked against each other before being
merged into one file. The class diagram's complete disconnection from reality suggests it was
generated independently from (and never checked against) either the real code or even this file's
own accurate sections.

### 4. Diagnostic Commands
```bash
# Confirm which class names in a diagram file actually exist in the module's real source:
grep -oP "name: '\K[^']+" frontend/src/data/diagrams/linkedin.js | while read -r cls; do
  grep -rq "class $cls\b\|interface $cls\b\|enum $cls\b" backend/src/main/java/com/lld/linkedin/ \
    || echo "NOT FOUND IN REAL SOURCE: $cls"
done

# A designPatterns/entities section can be internally consistent (passes structural tests) while
# describing nothing real — always read it side-by-side with the actual service class, the same
# discipline RCA-030's Preventative Measures already recommends for sequence diagrams.
```

### 5. Step-by-Step Resolution
1. Read every real class in `com.lld.linkedin` (`LinkedInService`, the new `LinkedInRepository`,
   `User`, `Profile`, `Connection`, `Message`, `JobPosting`, `Skill`, `Experience`, `Education`,
   `Notification`, both `NotificationObserver` implementations, both search-ranking strategy
   families) before writing a single line of the replacement.
2. Rewrote `diagrams/linkedin.js` from scratch: every class, field, method, and relationship now
   names something that actually exists in the real source, following this repo's no-exception/
   no-sim-plumbing class-diagram convention (CLAUDE.md).
3. Rewrote `design/linkedin.js`'s `requirements`, `entities`, `designPatterns`, `principles`,
   `oopConcepts`, and `extensibility` sections to match; left `tldr`, `tradeoffs`, and `solid` as-is
   since they were already accurate.
4. Cross-checked the sequence diagram (`data/sequences/linkedin.js`) separately — it was already
   correctly grounded in `sendConnectionRequest`'s canonical pair locking (confirmed by RCA-030's
   own sweep), so only the two files above needed a rewrite.
5. Ran the frontend suite (`npx vitest run`, 304/304) and `npm run build` (entry chunk unchanged at
   260.85 kB) to confirm the rewritten files are structurally valid — `designDataCoverage.test.js`
   cannot and does not verify truthfulness, only structure, so this step proves the files parse and
   register correctly, not that they're accurate; that assurance comes only from step 1.

### 6. Preventative Measures
1. `designDataCoverage.test.js` (and every other automated guard-rail in this repo) checks
   structural integrity, never truthfulness. A completely fictional but internally-consistent file
   passes every existing test. The only defense against this class of fabrication is a human (or
   agent) actually reading the real source before writing or trusting design documentation — the
   same lesson RCA-030's Preventative Measures already stated for sequence diagrams, now confirmed
   to apply equally to class diagrams and design-details files.
2. A file that is *partially* accurate (like `design/linkedin.js`'s tldr/tradeoffs/solid sections
   here) is not evidence the rest of the file is trustworthy — sections can come from different
   sources merged without cross-checking. Verify each section against real source independently
   rather than treating one accurate section as a signal the whole file is safe.
3. Given RCA-030 already fabricated content at the sequence-diagram layer across all 45 modules,
   and this incident shows the class-diagram/design-details layer was not immune either, any module
   not yet explicitly re-verified in this session's audit passes (grep each class diagram's class
   names against real source, the diagnostic command above) should be treated as unverified, not
   assumed clean, until someone actually does that check.

## RCA-037: Five Pages Were Hardcoded to the Dark Theme, and a Naive Hex→Token Bulk-Conversion Would Have Broken Both an Illustration and a Real-Content Page

### 1. Overview & Severity
**Severity: Medium.** `airline`, `library`, `linkedin`, `movieticket`, and `coffeemachine` had their
entire interactive UI hand-authored with the pre-theming era's dark-mode palette hardcoded directly
into inline `style={{ background: '#1e293b', color: '#f8fafc', ... }}` objects, so switching the site
to light theme via `ThemeToggle` left these five pages rendering the exact same dark cards, borders,
and text regardless of the user's chosen theme — the opposite of every other module, which reads
`var(--bg-secondary)` etc. from `theme.css`. Not a crash or data-loss bug, but a real, user-visible
inconsistency the user asked to have "done properly" rather than patched narrowly.

### 2. Symptoms & Error Logs
No exception, no test failure — `designDataCoverage.test.js` and `routing.test.js` don't inspect
inline style literals, so this shipped invisibly for as long as the five pages existed. Visually:
toggling to light theme anywhere else in the portfolio changes card/border/text colors; these five
pages stayed dark. No log output; found by a manual visual/grep sweep across every `lld/*/​*Page.jsx`
for known dark-theme hex literals (`#1e293b`, `#0f172a`, `#334155`, `#94a3b8`, `#64748b`,
`#f8fafc`/`#f9fafb`) that theme.css's tokens already had adaptive equivalents for.

### 3. Root Cause
These five pages were written before (or without adopting) the `theme.css` token system that the
rest of the portfolio uses — likely copy-pasted from an earlier single-theme design pass and never
retrofitted when theming was introduced elsewhere. Two second-order traps surfaced while fixing it:

- **Illustration content is not page chrome.** `vendingmachine`'s `MachineHardwareTab`/`SimulationTab`
  literally illustrate a physical vending-machine cabinet, LCD display, and coin/bill dispensers —
  the same hex values that mean "dark card background" elsewhere here mean "the plastic housing of a
  machine" and must stay fixed regardless of site theme. A first pass wrongly bulk-converted the
  entire file before the mistake was caught (the code's own `PHYSICAL VENDING MACHINE CABINET`
  comment was the tell) and required a full `git checkout --` revert. `coffeemachine` had the same
  trap in miniature: three individual literals (a "Whipped Cream Layer" swatch, an "Assembled Order
  Description" panel nested inside a still-hardcoded-dark hardware container, and an "Ingredient
  Hoppers Grid" label in the same container) were caught mid-sed and reverted one at a time.
- **A single hex value maps to two different, non-interchangeable roles.** `#334155` was used both
  as a `border:` line (safe to map to `var(--border-primary)`) *and* as a solid `background:` fill on
  buttons, avatars, and badges paired with `color: '#fff'`. `--border-primary` resolves to a *light*
  gray (`#d0d7de`) in light theme — so every button/avatar/badge converted this way silently became
  white text on a near-white background in light mode, an accessibility regression the exact-string
  grep used for the border conversion did not surface for background usages, and a follow-up
  ternary-background sweep (`background: cond ? 'x' : 'var(--border-primary)'`) caught two more
  instances (a LinkedIn "2nd Degree" badge, a LinkedIn chat bubble) plus one more of the same shape
  using `var(--text-muted)` as a background fill on Movie Ticket's held-seat tile — none of these
  three used the literal string `background: 'var(--border-primary)'` the first grep searched for,
  since the token appeared only inside a ternary expression.

### 4. Diagnostic Commands
```bash
# Find dark-theme literals with adaptive-token equivalents already defined in theme.css
grep -n "#1e293b\|#0f172a\|#334155\|#94a3b8\|#64748b\|#f8fafc\|#f9fafb" frontend/src/lld/<module>/<Module>Page.jsx

# Before converting anything, rule out illustration/physical-device content:
grep -n "374151\|4338ca\|312e81\|6b7280\|1f2937\|030712\|0b1120\|020617\|451a03\|4b5563\|1e1b4b\|111827" \
  frontend/src/lld/<module>/<Module>Page.jsx   # a hit means manual per-line review, not bulk sed

# After converting, find every var(--border-primary)/var(--text-muted) used as a FILL, not a border —
# both the flat-string and ternary shapes:
grep -n "background:.*var(--\(border-primary\|text-muted\))" frontend/src/lld/<module>/<Module>Page.jsx \
  | grep -v "border:"

# Sanity-check nothing was nested inside a permanently-dark rgba() overlay (those don't react to theme):
grep -n "rgba(0,0,0\|rgba(255,255,255" frontend/src/lld/<module>/<Module>Page.jsx
```

### 5. Step-by-Step Resolution
1. Converted `airline`, `library`, `linkedin`, `movieticket` in full: stripped `var(--token, #hex)`
   fallbacks down to `var(--token)`; bulk-`sed`'d the six dark-literal hex values to their `theme.css`
   token equivalents; fixed the resulting "white input text on now-light card" regression with a sed
   scoped to lines already containing `var(--bg-...)`.
2. Converted exactly one legitimate `coffeemachine` literal (JSON event-details text, confirmed its
   container was already theme-reactive) and reverted three false positives caught mid-pass (Whipped
   Cream Layer swatch, Assembled Order Description text, Ingredient Hoppers Grid label — all three
   nested inside hardcoded-dark hardware-panel containers, correctly still dark-only).
3. Fully reverted `vendingmachine` via `git checkout --` after recognizing its entire hardware tab is
   a deliberate physical-device illustration, confirmed by an empty `git diff` afterward.
4. Grepped all four bulk-converted files for `background: 'var(--border-primary)'` used as a flat
   button/avatar/badge fill (11 hits across the four files) and reverted every one paired with
   `color: '#fff'` back to the original literal `#334155`; separately verified the two paired with a
   non-white color (`#a78bfa` fixed badge text on library, `var(--text-secondary)` on a LinkedIn job
   badge) — the first was already correct (fixed dark bg + fixed light text, matching the pre-existing
   design), the second needed its text color pinned to a fixed `#cbd5e1` since `--text-secondary`
   renders as *dark* text in light theme against this badge's now-always-dark `#334155` background.
5. Ran a second, broader grep for the same misuse in *ternary* form (`cond ? 'x' : 'var(--border-
   primary)'`), which the first grep's exact-string match couldn't see, and found three more:
   LinkedIn's "2nd Degree" connection badge, LinkedIn's received-message chat bubble, and Movie
   Ticket's held-by-someone-else seat tile (this last one used `var(--text-muted)` as a background
   fill, not `--border-primary`) — reverted all three to their original fixed hex values.
6. Re-ran `npx vitest run` (304/304 passed) and `npm run build` (entry chunk 260.77 kB, unchanged
   from before this pass) to confirm no regression.

### 6. Preventative Measures
1. A bulk hex→token sed keyed on the literal string is blind to the same token appearing inside a
   ternary or template-literal expression. After any bulk conversion, always run a second pass
   grepping for the token itself (`var(--border-primary)`, etc.) rather than the original hex, to
   catch every place it landed — including ones the first pass's string-matching missed.
2. A CSS custom property's *name* documents its intended role (`--border-primary` implies "borders"),
   and reusing it for an unrelated role (a solid background fill) produces contrast bugs invisible in
   whichever theme happened to be active while eyeballing the diff — always check both themes'
   resolved values (see the token table in this repo's session context / `theme.css`) before trusting
   a token substitution, not just one.
3. Before converting any color in a page with a physical/illustrative UI section (vending machines,
   coffee machines, hardware panels), grep for the richer illustration-only palette this repo uses for
   such content (see Diagnostic Commands) — its presence is a strong signal that colors in that
   section carry representational meaning and must stay theme-invariant, not adaptive.

## RCA-038: Restaurant's and Traffic Signal's Class Diagrams/Design Details Described Fictional Domains, and Two Source Comments Cited the Wrong RCA Number for a Real Fix

### 1. Overview & Severity
**Severity: Medium.** Continuing the class-diagram/design-details fabrication audit RCA-036 started
for LinkedIn, a scripted class-existence sweep across all 45 modules' `diagrams/*.js` files (grep
every `name: '...'` against the module's real backend source) flagged six modules; three were script
false positives (a `record` declaration the grep pattern didn't match, and a nested enum
legitimately flattened into its own diagram box), but two were real: **restaurant**'s diagram and
design-details described a fictional `Menu`/`Table`/`Reservation`/`Chef`/`Waiter` system with a
Singleton `RestaurantService`, and **traffic-signal**'s described a fictional
`TrafficController`/`Road`/`TrafficSignal` system with an enum-only `SignalState` and Observer
marked `used: false` even though Observer is real and fully wired. Separately, while reading
`com.lld.trafficsignal`'s real source to write its replacement, two source-code javadoc comments
were found citing `(RCA-017)` for a thread-pool-leak fix that RCA-017's actual entry in this file
has nothing to do with (it documents an unrelated Digital Wallet ordering bug) — a documentation
citation error unrelated to the fabrication audit but discovered by it.

### 2. Symptoms & Error Logs
No test failure for either finding — `designDataCoverage.test.js` checks structure, not truthfulness,
exactly as RCA-036 already established. The class-existence sweep's raw output:
```
=== restaurant -> restaurant : MISSING: Chef Menu Restaurant Waiter
=== traffic-signal -> trafficsignal : MISSING: SignalController Timer
```
(`hotel`, `social-network`, `snakeladders`, `uber` also flagged initially; `snakeladders`/`uber` were
script false positives — the grep pattern didn't match `record` declarations — and `social-network`'s
`FriendRequestStatus` is a legitimate flattening of `FriendRequest`'s real nested `enum Status` into
its own diagram box, matching the same values. `hotel`'s `BookingStatus` — four values, no methods —
turned out to be a stale pre-refactor name for the real `ReservationStatus`, which now has six values
and a declared transition table; `hotel` is deferred to a follow-up pass since fixing it properly
means documenting hotel's real `TariffStrategy`/`CancellationRefundStrategy` layers that the current
diagram doesn't mention at all, a larger job than this pass's scope.)

The RCA-017 citation mismatch had no symptom either — it is two doc comments, never executed, never
tested — found only by manually reading the file the citation was in.

### 3. Root Cause
Same root cause as RCA-036: **restaurant** and **traffic-signal**'s diagram/design-details content
was written independently of (and never checked against) the real `com.lld.restaurant`/
`com.lld.trafficsignal` source. Concretely:
- **restaurant**: the real module has no `Menu` aggregate (menu items are a flat
  `ConcurrentMap<String, MenuItem>` keyed by id, each tagged with a `MenuCategory` enum), no
  `Reservation` feature at all, and no per-item kitchen tracking (`KitchenService` transitions a
  whole `Order` through `OrderStatus`, not individual `OrderItem`s). The one accurate part of the old
  design file was its `Strategy` pattern entry for `BillingStrategy`/`BillingStrategyFactory.forTime()`
  — which is real — the same "partially accurate file" trap RCA-036's Preventative Measures warned
  about.
- **traffic-signal**: the real module has no `Road` concept (a `TrafficLight` sits directly on an
  `Intersection`) and models phase transitions with real `SignalState` classes
  (`RedState`/`YellowState`/`GreenState`, each a singleton whose `next()` supplies the one legal
  successor) rather than an enum with a `nextState()` method. The old design file's `Observer` entry
  was marked `used: false` with speculative language ("could act as observers") despite
  `SignalChangeNotifier`/`SignalObserver`/`InAppSignalObserver`/`LoggingSignalObserver` being real,
  fully-wired classes that fire on every phase change — the opposite kind of error from a fabricated
  positive: a real, working feature was described as hypothetical.
- **RCA-017 citation**: `Intersection.java` and `ScheduledExecutorSignalTicker.java` both javadoc a
  real historical bug (an unshut-down `ScheduledExecutorService` spawned per intersection and per
  emergency-override call) and cite `(RCA-017)` for it. This repo's actual RCA-017 entry is titled
  "Digital Wallet's Repository Returned Wallets in Unspecified ConcurrentHashMap Iteration Order" —
  an unrelated module and an unrelated bug class. The thread-pool-leak fix itself is real and already
  shipped (the current `ScheduledExecutorSignalTicker` is a single shared, explicitly-`shutdown()`'d
  instance, not a per-call throwaway) — only the RCA number attached to it in the comments was wrong,
  most plausibly a copy-paste of a nearby number at the time the comment was written, never caught
  because nothing executes or tests a javadoc citation.

### 4. Diagnostic Commands
```bash
# The class-existence sweep this RCA's findings came from (also see RCA-036 §4):
for diagfile in frontend/src/data/diagrams/*.js; do
  # ... map diagram filename -> backend package, then for each `name: '...'`:
  grep -rq "class $cls\b\|interface $cls\b\|enum $cls\b\|record $cls\b\|record $cls(" \
    "backend/src/main/java/com/lld/$pkg/" || echo "NOT FOUND: $cls"
done
# Note the pattern MUST include `record $cls\b` — Java records (Snake, Ladder, FareEstimate, etc.)
# don't match a `class|interface|enum` grep and produce false positives otherwise.

# Confirm an RCA citation in a source comment actually refers to what the comment claims:
grep -n "RCA-017" backend/src/main/java/com/lld/trafficsignal/**/*.java   # find the citing comments
grep -n "^## RCA-017" RCA.md                                              # read what that number is actually about
```

### 5. Step-by-Step Resolution
1. Read every real class in `com.lld.restaurant` (`RestaurantService`, `RestaurantRepository`,
   `TableAllocationService`, `KitchenService`, all nine model/enum classes, the `BillingStrategy`
   family) before writing a replacement; rewrote `diagrams/restaurant.js` and `design/restaurant.js`
   from scratch, keeping only the already-accurate `BillingStrategy` Strategy-pattern description.
2. Read every real class in `com.lld.trafficsignal` (`TrafficSignalService`, `TrafficRepository`,
   `Intersection`, `TrafficLight`, the `SignalState` hierarchy, `SignalTicker` and its two
   implementations, the `SignalObserver`/`SignalChangeNotifier` pair) before writing a replacement;
   rewrote `diagrams/traffic-signal.js` and `design/traffic-signal.js` from scratch.
3. While reading `Intersection.java`'s javadoc, noticed the `(RCA-017)` citation and checked it
   against this file — confirmed the mismatch, then corrected both source citations
   (`Intersection.java`, `ScheduledExecutorSignalTicker.java`) to `(RCA-038)`, this entry, so the
   citation now resolves to an entry that actually describes the leak.
4. Deferred `hotel`'s `BookingStatus`→`ReservationStatus` staleness to a follow-up pass — fixing it
   properly means also documenting hotel's `TariffStrategy`/`CancellationRefundStrategy` layers the
   current diagram omits entirely, which is a larger job than a one-enum rename.
5. Ran the frontend suite (`npx vitest run`) and `npm run build` to confirm both rewritten pairs of
   files are structurally valid — as RCA-036 notes, this proves the files parse and register
   correctly, not that they're accurate; that assurance comes only from step 1/2's source reading.

### 6. Preventative Measures
1. Same as RCA-036 #1–#3: `designDataCoverage.test.js` checks structure, not truthfulness; a
   class-existence-only sweep (this RCA's diagnostic) is cheap and mechanical but still requires a
   `record $cls\b` alternation or it false-positives on every Java record in the codebase — checked
   here, worth keeping in mind for any future re-run of the sweep on the remaining ~41 modules.
2. A design file being *marked* `used: false` for a pattern is not proof the pattern is actually
   absent from the real code — traffic-signal's Observer entry shows the fabrication failure mode can
   run in either direction (claiming a fake pattern is used, or claiming a real one is not). Verify
   negative claims against source with the same rigor as positive ones.
3. An RCA citation embedded in a source comment is never checked by any test or build step — it can
   silently point at the wrong entry (or, if a number is ever reused, at someone else's incident)
   indefinitely. There is no cheap automated guard against this today; the only defense demonstrated
   here is a human (or agent) actually cross-referencing a cited number against this file while
   reading the surrounding code for an unrelated reason.

## RCA-039: Hotel's Class Diagram and Design Details Documented a Pre-Refactor Version of the Module

### 1. Overview & Severity
**Severity: Low-Medium.** The class-existence sweep from RCA-038 flagged `hotel`'s diagram
(`BookingStatus` — 4 values, no such class in `com.lld.hotel`) as the last unresolved item from that
pass, deferred pending a closer look. Reading the real source confirmed it: `hotel`'s diagram and
design-details predate a real refactor and describe a `RoomStatus` with `BOOKED`/`OCCUPIED` as
room-wide flags, a 4-value `BookingStatus`, and a single lock field directly on
`HotelService`/`HotelRepository` — none of which exist anymore — while omitting the real
`RoomBookingService`, `TariffStrategy` family, and `CancellationRefundStrategy` family entirely. The
old design file's own "Dynamic Pricing" extensibility idea proposed adding a `PricingStrategy`
interface — which, by the time this was read, had already shipped as `TariffStrategy`.

### 2. Symptoms & Error Logs
No test failure — same as RCA-036/RCA-038, `designDataCoverage.test.js` checks structure, not
truthfulness. The class-existence sweep's only hit for this module:
```
=== hotel -> hotel : MISSING: BookingStatus
```
`Booking`, `Hotel`, `Room`, `RoomType` all did resolve to real classes, which is why this one read as
a narrower "stale enum name" issue rather than the wholesale fictional-domain fabrication RCA-036/038
found elsewhere — the true gap only became visible on reading the full real source, not from the
sweep alone.

### 3. Root Cause
The diagram/design content was written against an earlier version of `com.lld.hotel` and never
updated when the module was refactored to add per-date-range availability, `RoomBookingService`, and
the two Strategy families. `ReservationStatus`'s own javadoc documents the motivating bug directly:
*"The previous model had four statuses (CONFIRMED/CHECKED_IN/CHECKED_OUT/CANCELLED) with each
service method deciding for itself which source states it would accept — e.g. cancel() rejected
CHECKED_OUT and CANCELLED by name but silently allowed cancelling a CHECKED_IN guest out of a room
they were standing in."* The diagram/design files kept describing that earlier model verbatim
(including the exact four old status names) after the real enum grew to six values with a declared
transition table, and `RoomStatus` dropped `BOOKED`/`OCCUPIED` entirely once availability became a
per-date-range check via `Booking.overlaps()` rather than a room-wide flag.

Separately, `HotelService`'s own javadoc notes *"the interactive simulation sandbox (/sim/*), the
8-step frontend walkthrough ... are not yet wired up"* — unlike `restaurant`/`traffic-signal`/most of
the reference-bar modules, `hotel` has no `/sim/*` engine at all yet. That is a module-maturity gap
(CLAUDE.md's "module maturity is uneven"), not a fabrication, and is out of scope for this pass; it
would need the `/simulation` skill's full treatment, not a diagram/design correction.

### 4. Diagnostic Commands
```bash
# Same class-existence sweep as RCA-036/038 (see those entries' §4)
grep -oP "name: '\K[^']+" frontend/src/data/diagrams/hotel.js | while read -r cls; do
  grep -rq "class $cls\b\|interface $cls\b\|enum $cls\b\|record $cls\b" backend/src/main/java/com/lld/hotel/ \
    || echo "NOT FOUND: $cls"
done

# A name that DOES resolve (Booking, Room) is not proof its fields/enum values are current —
# diff the enum's real values against what the diagram lists:
grep -A8 "enum ReservationStatus" backend/src/main/java/com/lld/hotel/model/ReservationStatus.java
grep -A8 "name: 'BookingStatus'" frontend/src/data/diagrams/hotel.js   # (the stale name, pre-fix)
```

### 5. Step-by-Step Resolution
1. Read every real class in `com.lld.hotel` (`HotelService`, `RoomBookingService`,
   `HotelRepository`, `Hotel`/`Room`/`Booking` and their enums, both Strategy families) before
   writing a replacement.
2. Rewrote `diagrams/hotel.js` and `design/hotel.js` from scratch: `RoomStatus` now shows only
   `AVAILABLE`/`MAINTENANCE`; `ReservationStatus` (not `BookingStatus`) shows all six real values;
   `RoomBookingService`, `TariffStrategy`/`StandardTariffStrategy`/`WeekendTariffStrategy`/
   `TariffStrategyFactory`, and `CancellationRefundStrategy`/`FullRefundStrategy`/
   `PartialRefundStrategy`/`NoRefundStrategy`/`CancellationRefundStrategyFactory`/`RefundResult` are
   now all documented; the "Dynamic Pricing" extensibility idea was replaced since the pricing
   strategy it proposed already exists.
3. While rewriting, found and fixed one real inaccuracy in the already-existing
   `sequences/hotel.js`: it showed `TariffStrategyFactory` resolving by `room.getType()` via a
   `getTariffStrategy(...)` call; the real method is `resolve(checkIn, checkOut)`, keyed on whether
   the stay touches a Friday/Saturday night, not on room type. Corrected both the method name and
   the resolution basis shown in the sequence steps.
4. Left `hotel`'s missing `/sim/*` engine and simulation tab untouched — a real gap, but a
   module-maturity one for a future `/upgrade-lld` or `/simulation` pass, not a documentation
   fabrication this pass's diagnostic (or scope) covers.
5. Ran the frontend suite (`npx vitest run`, 304/304) and `npm run build` (entry chunk unchanged at
   260.77 kB) to confirm the rewritten files are structurally valid.

### 6. Preventative Measures
1. A class name resolving to a real class (as `Booking`/`Room`/`Hotel` did here) is not proof the
   *rest* of that class's diagram entry — its fields, its enum values, its associated Strategy
   layers — is current. The class-existence sweep is a floor, not a ceiling; a module that clears it
   can still describe a stale pre-refactor version of itself, as this one did.
2. When a refactor's own javadoc explicitly narrates "the previous model had N statuses and this bug
   class" (as `ReservationStatus`'s does here), that comment is a direct, load-bearing signal that
   any design documentation predating the refactor needs re-verification — it is effectively the
   author already having written the diff summary for whoever checks the diagrams next.
3. An "extensibility" section proposing a pattern to add in the future is itself a signal worth
   checking against real source before trusting the rest of the file — if the proposed pattern
   already exists (as `TariffStrategy` did here), the design content is provably stale, not just
   possibly so.

## RCA-040: Chess Was a Fully Standalone Page With an Unscoped `body` Override, the Same Architectural Bug Issue #53 Fixed for Snake & Ladders and Minesweeper

### 1. Overview & Severity
**Severity: Low.** `ChessPage.jsx` rendered its own document shell — a `<style>` tag injecting a
global `* { margin: 0 }` reset and an unscoped `body { background: #1a1a2e; color: #e0e0e0 }` rule,
its own `<header>`/back-link/`<nav>` tab bar, and manually mounted `ClassDiagram`/`SequenceDiagram`/
`DesignDetails` for the diagram/sequence/design tabs — instead of the shared `LldPage` shell every
other module uses. This is architecturally identical to the bug issue #53 fixed for Snake & Ladders
and Minesweeper this session: an unscoped `body` rule stays in effect for as long as the component
is mounted, painting the whole document (not just this page's content) regardless of which theme —
light or dark — the site is set to, and a component-owned tab bar duplicates `LldPage`'s
breadcrumb/header/tabs instead of composing with it.

### 2. Symptoms & Error Logs
No test failure — `routing.test.js` only checks that every route has a file and every file is
routed, not which shell a page renders inside; `designDataCoverage.test.js` only checks the
diagram/design *data*, not which component renders it. Visually: navigating to `/chess` painted the
whole browser tab (not just the page content) with `#1a1a2e` regardless of the site's light/dark
theme setting, and the page had its own narrower fixed-width layout and tab styling instead of the
site-wide 1200px `LldPage` shell.

### 3. Root Cause
Same root cause as issue #53: this page predates (or was never migrated to) the `LldPage` shell
convention documented in `CLAUDE.md` ("`LldPage` is the shared shell... a page that also renders
`<ClassDiagram>` for those tabs is writing dead code"). It manually re-implemented the header, back
link, tab bar, and diagram/sequence/design tab rendering that `LldPage` already provides, and its
`<style>` block reset `body` globally rather than scoping every rule to the component's own markup.

### 4. Diagnostic Commands
```bash
# Find any lld page still injecting an unscoped body/*-selector rule instead of using LldPage:
grep -rl "^body\s*{" frontend/src/lld/*/*Page.jsx
grep -rL "LldPage" frontend/src/lld/*/*Page.jsx | xargs grep -l "ClassDiagram\|SequenceDiagram\|DesignDetails"
```

### 5. Step-by-Step Resolution
1. Migrated `ChessPage.jsx` to the `LldPage` shell, following the exact pattern already applied to
   `SnakeLaddersPage.jsx`/`MinesweeperPage.jsx` this session: `tabs={[{ id: 'game', label: '🎮 Game'
   }, 'simulation', 'diagram', 'sequence', 'design']}`, with `<style>` now scoped to only the
   component-specific classes (`.setup`, `.chess-board`, `.game-status`, `.scene`, `.popup`, etc.) —
   the `*`/`body`/`.app`/`header`/`nav`/`main` page-chrome rules were removed entirely since
   `LldPage`'s own shell and `LldPage.css` already supply the equivalent card/header/tab-bar look.
2. Left every component-specific hardcoded color as-is — this is a structural shell migration, not
   a theme-adaptive-color pass (that is a separate, already-partially-completed effort tracked
   elsewhere in this session's work); mixing the two would make the diff harder to review for either
   concern.
3. Ran the frontend suite (`npx vitest run`, 304/304) and `npm run build` (entry chunk unchanged at
   260.77 kB) to confirm the migration didn't break anything structurally.

### 6. Preventative Measures
1. Same preventative measure as issue #53: a repo-wide grep for `^body\s*{` inside `frontend/src/
   lld/**/*Page.jsx` finds any remaining standalone pages before a user has to notice the wrong
   background color live. This is the second and (per that grep) now the last such module found this
   session — worth an occasional sweep after future `/new-lld` additions, since a copy-pasted
   pre-`LldPage`-era page is an easy way for this pattern to resurface.

## RCA-041: Auditing the Remaining 15 Theme-Color-Flagged Modules Found Only One Real Instance — the Rest Were Illustrations, Semantic Status Colors, or Already-Correct Fallback Syntax

### 1. Overview & Severity
**Severity: Low.** RCA-037's color-conversion pass covered 5 modules (airline, library, linkedin,
movieticket, coffeemachine); a prior broader audit had also flagged 15 more modules as unaudited for
the same "hardcoded regardless of theme" issue: hotel, stackoverflow, splitwise, parking,
shoppingcart, lru-cache, ludo, uber, zomato, traffic-signal, logging-framework, auction,
digitalwallet, elevator, h2o. Auditing all 15 against the same dark-literal hex set found only
**one** real fix needed (zomato's Telemetry HUD block, described below) — every other hit was either
a deliberate illustration (uber's night-time city map, lru-cache's memory-rack visualization,
zomato's own delivery-scene SVG), a semantic status/severity color that must stay fixed regardless
of theme (logging-framework's TRACE/DEBUG/INFO/WARN/ERROR/FATAL color map), text sitting on an
already-fixed-dark `rgba(...)` overlay (splitwise's simulation card, parking's glassmorphism HUD), or
9 of the 15 modules (hotel, stackoverflow, shoppingcart, ludo, auction, digitalwallet, elevator, h2o,
traffic-signal) having zero hits on the dark-literal hex set at all — they were already built
theme-adaptive from the start.

### 2. Symptoms & Error Logs
No visible bug for 14 of the 15 modules — the flagged hex hits were either not page chrome at all, or
(for zomato) were already resolving correctly at runtime since a defined CSS variable always wins
over its own fallback. The only symptom that existed was latent, not observed: `var(--token, #hex)`
syntax with a redundant fallback is harmless while the token stays defined in `theme.css`, but the
repo-wide convention established in RCA-037 (`var(token, #hex)` → `var(token)`) exists so no page
carries a fallback that silently masks a future accidental token removal.

### 3. Root Cause
The original broader grep that flagged these 15 modules matched on hex-literal *presence*, not on
whether that literal was acting as always-dark page chrome — the same distinction RCA-037 had to
learn the hard way for coffeemachine/vendingmachine. Applied more carefully here:
- **uber**'s `.uber-flow-scene`/`.uber-road` (`#0f172a`/`#1e293b`/`#334155`/`#64748b`) is an "Enhanced
  City Map Graphic Scene" — a night-sky gradient and asphalt-colored road illustration, confirmed by
  its own comment.
- **lru-cache**'s `.sim-container`/`.sim-slot`/`.sim-packet` (`#0b1329`/`#1e293b`/`#334155`/
  `#94a3b8`/`#64748b`) is a "Server Memory Slots Grid" / "MEMORY RACK SLOTS" hardware visualization,
  confirmed by its own UI labels.
- **zomato**'s SVG "2D Graphic City Scene" (`#0f172a`/`#1e293b`/`#94a3b8`/`#64748b`/`#334155` used as
  SVG `fill`/`stroke` attributes) is a "Night Sky & Background" delivery-route illustration.
- **logging-framework**'s `LEVEL_COLORS.DEBUG: '#64748b'` is one entry in a
  TRACE/DEBUG/INFO/WARN/ERROR/FATAL severity color map — the same category as a status badge color,
  which RCA-037 already established should stay fixed regardless of theme.
- **splitwise**'s `.sw-sim-card` and **parking**'s glassmorphism HUD both set their own container
  background to a fixed `rgba(30,41,59,0.9)` / `rgba(15,23,42,0.85)` overlay — RCA-037's second
  safety check (never convert text nested inside an already-fixed-dark `rgba(...)` container) applies
  directly; the `#94a3b8`/`#64748b` text inside them is correctly legible against that fixed
  background in both themes.
- **zomato**'s Telemetry HUD block (`Order ID`/`Order Status`/`Assigned Agent`/etc. tiles) was the one
  real, if minor, finding: every value was already `var(--bg-card, #1e293b)` / `var(--border-primary,
  #334155)` / `var(--text-muted, #94a3b8)` — correct and already theme-adaptive at runtime, just
  carrying the same redundant hex fallback RCA-037 established stripping elsewhere in the portfolio.

### 4. Diagnostic Commands
```bash
# Same dark-literal sweep as RCA-037, now run across the remaining 15 flagged modules:
grep -c "#1e293b\|#0f172a\|#334155\|#94a3b8\|#64748b\|#f8fafc\|#f9fafb" frontend/src/lld/<module>/<Module>Page.jsx

# For any module with hits, before touching anything: is this inside a genuine illustration
# (a UI label like "MEMORY RACK SLOTS" or "City Map Graphic Scene" nearby is the tell), a semantic
# status/severity color map, or text nested inside an already rgba(...)-fixed-dark container?
# Only a `var(--token, #hex)` occurrence with none of the above is a real fallback-stripping case.
```

### 5. Step-by-Step Resolution
1. Ran the dark-literal grep across all 15 modules; 9 had zero hits (already fully theme-adaptive).
2. Individually read the surrounding context for every hit in the remaining 6 modules (splitwise,
   parking, lru-cache, uber, zomato, logging-framework) before touching anything, per the illustration
   /semantic-color/fixed-overlay checks established in RCA-037.
3. Stripped the redundant `, #hex` fallback from zomato's Telemetry HUD block only — the sole real
   finding; left the other 5 modules (and the rest of zomato, including its own SVG scene)
   byte-for-byte unchanged.
4. Ran the frontend suite (`npx vitest run`, 304/304) and `npm run build` (entry chunk unchanged at
   260.77 kB) to confirm no regression.

### 6. Preventative Measures
1. Same as RCA-037 #3: before converting any hex literal, check for a UI label or code comment naming
   what it renders ("MEMORY RACK SLOTS", "Enhanced City Map Graphic Scene", "Night Sky & Background")
   — this repo's simulation tabs regularly illustrate a physical scene, and the label is usually
   present precisely because the author wanted the metaphor legible.
2. A module having zero hits on a known dark-literal set is not the same claim as "this module has no
   theme bugs" — it only means this module isn't hardcoded to *this specific* palette. It is,
   however, reasonably strong evidence for a module built after the theming convention existed, which
   was true for all 9 zero-hit modules here.
3. Auditing a flagged list before touching any of it can shrink the real scope dramatically — of 15
   modules originally flagged, only one needed an actual change, and that change was a one-line-per-
   occurrence cosmetic cleanup, not a contrast bug. Don't assume a flagged list's size predicts the
   size of the fix.

## RCA-042: Four Modules' Design-Details Entities Had No `fields`/`methods`, So Their Entities Tab Rendered an Empty Accordion on Expand

### 1. Overview & Severity
**Severity: Medium.** User-reported: expanding an entity on Snake & Ladders' Design Details →
Entities tab showed no attributes or methods. `EntitiesTab.jsx` renders an entity's `fields`
(`{name, type, description}`) and `methods` (`{name, returns, description}`) arrays; an entity
object carrying only `{name, description}` has nothing to render once expanded — the exact same
root cause already fixed for `tictactoe.js` earlier this session, but never swept across the rest
of the portfolio. A file-by-file scan of every `design/*.js` found three more modules with the same
gap: **lru-cache** (all 8 entities had no `fields`/`methods` at all), **inventory** (3 of 7:
`StockAlertObserver`, `ReorderStrategy`, `StockAlert`), and **social-network** (1 of 7:
`FeedObserver`).

### 2. Symptoms & Error Logs
No test failure — `designDataCoverage.test.js` checks that every module id resolves to *some*
design data and that there are no duplicate barrel keys; it does not inspect whether an individual
entity object carries `fields`/`methods`. Visually: clicking any affected entity to expand it shows
an empty section where the attributes/methods table should be. Reported by the user directly for
Snake & Ladders; the sweep below found the same shape elsewhere before anyone else hit it.

### 3. Root Cause
Same as the earlier `tictactoe.js` fix: these entities were written with only a `name` and a prose
`description`, never filled in with the structured `fields`/`methods` arrays `EntitiesTab.jsx`
actually renders. `lru-cache.js` was the worst case — literally every one of its 8 entities lacked
both arrays, meaning the entire Entities tab for that module rendered empty regardless of which
entity a visitor expanded. This is a different failure mode from RCA-002/RCA-036/RCA-038's
duplicate-key or fabricated-content bugs: the prose descriptions here are accurate, just structurally
incomplete for what the UI component expects.

### 4. Diagnostic Commands
```bash
# A string-literal-aware scan of every design/*.js file's `entities` array, flagging any entity
# object with neither a `fields` nor a `methods` key (naive regex/bracket-counting breaks on type
# strings like 'int[]' or 'Move[]' that contain literal [ ] characters inside a string literal —
# this script masks bracket/brace characters found inside quotes/comments to a neutral char first,
# preserving string length so positions still map 1:1 onto the real file for extraction):
node /tmp/scan_entities3.mjs   # see this RCA's step 5 for the script's approach if recreating it

# Cross-check any real finding against a KNOWN, already-fixed module before assuming it's a bug —
# an entity summarizing an exception hierarchy or a whole strategy family in prose only (no fields/
# methods) is an established, intentional convention here (see TicTacToeException hierarchy,
# LruCacheException hierarchy, SnakeLaddersException hierarchy — none of these are "one class").
```

### 5. Step-by-Step Resolution
1. Wrote a string-literal-aware Node script scanning every `design/*.js` file's `entities` array
   (naive regex/bracket-counting misfires on type strings containing literal `[`/`]`, e.g. `'int[]'`
   — the script masks bracket characters found inside quotes to a neutral character first while
   preserving string length, so the masked positions still map 1:1 onto the real file).
2. First pass flagged `car-rental.js`/`course-registration.js` with many false positives — traced to
   the script matching the wrong `entities:` occurrence or breaking on escaped quotes; fixed the
   masking to also handle backslash-escaped characters inside strings, which eliminated all of them.
3. Confirmed the four genuine findings (`snakeladders.js` — the user's original report — plus
   `lru-cache.js`, `inventory.js`, `social-network.js`) by reading each affected class's real backend
   source (`Game`/`Player`/`DiceRoller`/`GameRepository`/`GameState` for snakeladders;
   `LruCache`/`Node`/`EvictionPolicy` and its three implementations/`LruCacheService` for lru-cache;
   `StockAlertObserver`/`ReorderStrategy`/`StockAlert` for inventory; `FeedObserver` for
   social-network) before writing any `fields`/`methods` content.
4. Also added two entities `snakeladders.js`'s array was missing entirely — `SnakeLaddersService`
   and `GameRepository` — since `tictactoe.js`'s already-fixed entities array includes its
   equivalent service/repository pair and the same completeness bar should apply here.
5. Left every `*Exception hierarchy` summary entity (in `tictactoe.js`, `lru-cache.js`,
   `snakeladders.js`) without `fields`/`methods`, matching the convention `tictactoe.js`'s earlier
   fix already established: an entity describing a whole exception family in prose, not one class,
   correctly has nothing structured to render.
6. Ran the frontend suite (`npx vitest run`, 304/304) and `npm run build` (entry chunk unchanged at
   260.77 kB) to confirm the added content is structurally valid.

### 6. Preventative Measures
1. `designDataCoverage.test.js` verifies an id resolves to design data and that there are no
   duplicate barrel keys — it does not, and structurally cannot easily, verify that every entity
   object carries the `fields`/`methods` shape `EntitiesTab.jsx` needs to render something on
   expand. A schema-level test (every `entities[]` item either has both `fields` and `methods` keys,
   or is an allowlisted prose-only summary type) would have caught all three of these before a user
   did.
2. This is the second time in one session a `tictactoe.js`-shaped fix (RCA established the pattern,
   then found the same gap elsewhere only because a user or a follow-up sweep asked) was needed —
   once a repo establishes a required shape for one module via a real bug fix, sweep the same shape
   requirement across every other module immediately rather than waiting for another individual
   report per module.

## RCA-043: Hotel's "Simulation" Tab Mutated Real Production Data, and Its Controller Silently Coerced Every Domain Failure to HTTP 400

### 1. Overview & Severity
**Severity: Medium-High.** Closing the module-maturity gap RCA-039 flagged (hotel had no
`/sim/*` engine, unlike every other reference-bar module) surfaced two real, independent bugs while
building it: (1) hotel's existing frontend "Simulation" tab was never actually isolated — it called
the real `bookRoom`/`checkInBooking`/`checkOutBooking` production endpoints directly, so every
visitor who clicked through the demo genuinely booked, checked in, and checked out Room R3 against
live hotel data; (2) `HotelController` wrapped every endpoint in a `try/catch (Exception e)` that
unconditionally returned `ResponseEntity.badRequest()` (HTTP 400), completely bypassing the
already-correct `HotelException` hierarchy's per-exception `@ResponseStatus` values and the shared
`GlobalExceptionHandler` — so a 404-worthy `RoomNotFoundException` or a 409-worthy
`RoomUnavailableException` both silently came back as 400.

### 2. Symptoms & Error Logs
No test caught either bug: no existing test asserted an HTTP status code for any hotel endpoint
(`HotelServiceTest`/`HotelConcurrencyTest` both call `HotelService` directly, never through
`HotelController`), and `HotelPage.jsx`'s "Simulation" tab visually looked identical whether it was
touching real or sandboxed data — the only tell was `HotelService`'s own javadoc: *"the interactive
simulation sandbox (/sim/*)... are not yet wired up"*, and reading `AnimatedFlow`'s `doBook`/
`doCheckIn`/`doCheckOut` handlers to see they called the plain (non-`sim`-prefixed) `api.js`
functions.

### 3. Root Cause
- **Fake simulation isolation**: hotel never had a `/sim/*` engine to begin with, so whoever built
  the frontend "Simulation" tab wired its guided walkthrough to the only endpoints that existed —
  the real ones. This is the exact isolation guarantee CLAUDE.md's "Modules with an interactive UI
  simulation expose an isolated `/sim/*` endpoint set backed by a separate sandbox instance"
  convention exists to prevent, just never implemented for this module.
- **Controller-level exception coercion**: `HotelController` was written before (or without
  adopting) this repo's shared exception contract — every method individually caught `Exception`
  and hand-built an `ErrorResponse.of(e)` at a hardcoded 400, rather than letting the exception
  propagate to `GlobalExceptionHandler`, which already reads each exception's `@ResponseStatus` via
  `AnnotationUtils`. The concrete exceptions were already correctly annotated
  (`RoomNotFoundException`/`HotelNotFoundException`/`BookingNotFoundException` → 404,
  `RoomUnavailableException`/`InvalidReservationTransitionException` → 409,
  `InvalidDateRangeException` → 400) and `HotelException` was already in
  `DomainExceptionContractTest`'s allowlist — the annotations were simply never given the chance to
  take effect.

### 4. Diagnostic Commands
```bash
# Find a module's simulation UI calling non-sim-prefixed (i.e. real/production) API functions:
grep -n "await book\|await checkIn\|await checkOut\|await cancel" frontend/src/lld/<module>/<Module>Page.jsx
# — a match inside a component named AnimatedFlow/SimulationTab/*Sim* is the tell.

# Find a controller whose own try/catch defeats an otherwise-correct exception hierarchy:
grep -n "catch (Exception" backend/src/main/java/com/lld/<module>/controller/*.java
# then cross-check: are the module's own exceptions already correctly @ResponseStatus-annotated?
grep -n "@ResponseStatus" backend/src/main/java/com/lld/<module>/exception/*.java
```

### 5. Step-by-Step Resolution
1. Added `com.lld.hotel.model.SimEvent` (majority-convention shape, matching 23 other modules).
2. Added a sim sandbox to `HotelService`: a second `HotelRepository` instance and a second
   `RoomBookingService` instance constructed against fresh `TariffStrategyFactory`/
   `CancellationRefundStrategyFactory` instances (reusing the real classes, not a parallel copy of
   their locking/pricing/refund logic) — the same shape as restaurant's
   `simTableAllocationService`/`simKitchenService`. Added `simReset`/`simState`/`simBook`/
   `simCheckIn`/`simCheckOut`/`simCancel`/`simEvents`, plus `simRace`, which runs N threads racing to
   book the same room for the same date range via a `CountDownLatch`-released `ExecutorService`,
   proving `RoomBookingService`'s per-room lock lets exactly one win rather than asserting it in
   prose (mirrors restaurant's `simRace`).
3. Added `/api/hotel/sim/*` endpoints to `HotelController`, and, while rewriting that file anyway,
   removed every `try/catch (Exception e)` block — every endpoint now lets a thrown
   `HotelException` subtype propagate to `GlobalExceptionHandler`, which maps it to its real
   `@ResponseStatus`.
4. Migrated `HotelPage.jsx` to the shared `LldPage` shell (it was a fully standalone page — own
   header/back-link/nav, manually mounted `ClassDiagram`/`SequenceDiagram`/`DesignDetails` — the
   same bug shape issue #53 and RCA-040 already fixed for other modules) and replaced `AnimatedFlow`
   with a `SimulationTab` driving the new isolated `/sim/*` endpoints via an 8-step guided
   walkthrough: reset → book a weekend-inclusive stay (exercising `WeekendTariffStrategy`) → a
   5-guest concurrency race on a second room → check-in → check-out → book a second, non-weekend
   stay (exercising `StandardTariffStrategy`) → cancel it (exercising `CancellationRefundStrategy`)
   → final snapshot.
5. Added `HotelSimTest` (7 cases) covering `simReset`/`simBook`/the check-in/check-out lifecycle/
   `simCancel`'s refund resolution/`simRace`'s exactly-one-winner guarantee/its guest-count
   clamping. Ran the full `com.lld.hotel.**` suite (19/19 passing, including the pre-existing
   `HotelServiceTest`/`HotelConcurrencyTest`), `npx vitest run` (304/304), and `npm run build`
   (entry chunk unchanged at 260.78 kB).

### 6. Preventative Measures
1. A module's own doc comment stating a feature "is not yet wired up" is a direct, load-bearing
   signal — the same lesson RCA-039 drew from `ReservationStatus`'s refactor-narrating javadoc, now
   confirmed for a missing-feature comment too. Grep every module's service/controller for "not yet"
   or "NOTE:" comments periodically; they tend to describe exactly the gap that needs closing next.
2. A frontend "Simulation" tab calling the same `api.js` functions the live UI calls (rather than
   `sim`-prefixed ones) is invisible by inspection of the running app — it looks and behaves
   identically to a real isolated demo until someone reads the handler code or the data it mutates.
   The diagnostic grep above (non-sim-prefixed calls inside a component named `*Flow`/`*Sim*`) is
   cheap enough to run across every module that claims to have a simulation tab.
3. A controller's own `try/catch (Exception e)` returning a fixed status code silently defeats an
   otherwise fully correct exception hierarchy — `DomainExceptionContractTest`/
   `GlobalExceptionHandlerTest` verify the mapping table itself is correct, but neither test
   exercises real controllers end-to-end for every module, so a controller that never lets an
   exception reach the handler passes both suites while still returning the wrong status code on
   every request. `ErrorContractIntegrationTest`'s MockMvc-based approach is the right template to
   extend per-module if this class of bug needs a systematic guard rather than a per-report fix.

## RCA-044: A Systematic 45-Module Content-Accuracy Sweep Found Five More Modules Whose Design Docs Described an Architecture That Doesn't Exist

### 1. Overview & Severity
**Severity: Medium-High.** Every prior fabrication fix this cycle (RCA-036, -038, -039, -040) was
found opportunistically — while working on something else in that specific module. This time the
same class-name-existence technique that closed out RCA-030/031/034 for sequence diagrams was
generalized into a repeatable script and run against all 45 modules' `diagrams/{module}.js` +
`design/{module}.js` at once, rather than waiting for the next accidental discovery. It found five
more real defects, two of them (**cricinfo**, **music-streaming**) as severe as the original
restaurant/traffic-signal fabrications: entire invented service layers (`MatchService`/
`ScoringService`/`CommentaryService`; `StreamingService`/`RecommendationEngine`/`DownloadManager`)
that contradict those same modules' own — already-accurate — class diagrams, plus behavior
(`addBall()`, `likeSong()`, `shuffle()`, `activate()`) invented directly on plain Lombok models
that carry zero methods in the real source. **concert-ticket** and its own class diagram had the
identical bug (a `BookingService` that doesn't exist, methods invented on `Event`/`Seat`/`Booking`)
independently of cricinfo/music-streaming — three separate authors/passes apparently reached for
the same "put the logic on the model, not the service" generic-LLD-template shape without checking
this repo's actual convention. **coffee** and **social-network** were narrower: one invented
`CoffeeRepository`/DI class in an otherwise-accurate file, and one misnamed a real nested enum.

### 2. Symptoms & Error Logs
No test failure, no user report — `designDataCoverage.test.js` passed the whole time, because it
only proves every id resolves to *some* data and every diagram edge points at a *declared* class;
it has no way to know whether that class or its fields/methods are real. The only way to see the
defect was to read the module's actual `.java` source side by side with its design data — exactly
what the systematic sweep automated.

### 3. Root Cause
- **The check that would have caught this never ran at portfolio scale.** RCA-030/031/034 built
  and used a class-name-existence technique for sequence diagrams across all 45 files; RCA-036/038/
  039/040 applied the equivalent idea to class diagrams/design details, but only for the specific
  module a person happened to already be reading. Nothing had ever run the same check against
  `diagrams/*.js` + `design/*.js` for all 45 modules in one pass.
- **A naive first pass under-catches by design.** Checking only the declared `classes[].name` /
  `entities[].name` arrays against real filenames caught the concert-ticket/cricinfo/music-streaming
  entity lists, but missed fabricated names hiding inside free-text `patterns`/`principles`/
  `oopConcepts`/`extensibility` prose (e.g. cricinfo's `ScoringService` was only ever mentioned in a
  sentence, never given its own `entities[]` row) and, independently, missed **method-level**
  fabrication entirely — concert-ticket's and cricinfo's own class *diagrams* passed the name check
  because `Event`/`Seat`/`Booking`/`Match`/`Innings`/`Ball` are real class names; the fabrication was
  in what methods got attributed to them, not whether the names existed.
- **Cross-module comparisons are legitimate and look identical to a real bug on a naive prose scan.**
  Sentences like *"same idiom as uber's `DriverAssignmentService`"* or *"could add a
  `SeasonalTariffStrategy`"* (an explicit, marked hypothetical in an Extensibility section) name a
  class that is real elsewhere, or deliberately doesn't exist yet — a role-suffix-name scan has to
  cross-check against the *entire* backend's type registry and treat clearly-hypothetical language
  (`could`, `would`, `add a`) differently from an assertion, or it drowns the five real defects in
  ~30 false positives.

### 4. Diagnostic Commands
```bash
# Pass 1 — every entities[]/classes[] name in every module, checked (incl. nested types found by
# scanning file contents, not just filenames) against that module's own real .java source:
node audit.mjs   # see RCA.md history / session transcript for the full script

# Pass 2 — every architectural-role-suffixed identifier (...Service, ...Engine, ...Strategy, etc.)
# anywhere in the file TEXT (catches fabrications hiding in prose, not just entities[]), checked
# against a GLOBAL registry of every real type name across all 45 modules (so a legitimate
# cross-module comparison isn't flagged), with JDK/Spring types and "could add"/"would let"
# hypothetical language excluded:
node audit2.mjs

# Any survivor from both passes needs a manual read: grep the flagged name across
# frontend/src/data/{diagrams,design}/<module>.js for context, then read the real backend
# service/model files it's supposed to describe.
```

### 5. Step-by-Step Resolution
1. **concert-ticket** — full rewrite of both `diagrams/concert-ticket.js` and
   `design/concert-ticket.js` from real source. Replaced the invented `BookingService` (with
   `eventRepo`/`bookingRepo`/`seatLock`/`paymentGateway` fields and a fabricated `ETicket` return
   type) with the real `ConcertTicketService` + `SeatLockManager` + `PaymentProcessor` +
   `CancellationPolicyFactory` split, and stripped invented methods
   (`Event.bookSeats()`/`Seat.book()`/`Booking.confirm()`/`User.bookEvent()`) off models that are
   plain `@Data` POJOs with zero methods in the real source.
2. **cricinfo** — full rewrite of `design/cricinfo.js` only (its `diagrams/cricinfo.js` was already
   accurate and needed no change). Replaced the invented `MatchService`/`ScoringService`/
   `CommentaryService` 3-service split with the real single-facade + Observer architecture
   (`CricinfoService` → `BallRecordingEngine` → `MatchPublisher` → `ScorecardProjectionObserver`/
   `PlayerCareerStatsObserver`/`CommentaryObserver`/`BallEventAuditObserver`), and corrected that
   `Innings`/`Ball`/`Player` carry no methods at all (batting/bowling-average math lives on
   `CareerStats`, not `Player`).
3. **music-streaming** — targeted rewrite of the `entities[]` sections of both files (their
   `designPatterns` sections were already accurate and left untouched) plus the handful of
   `principles`/`oopConcepts`/`extensibility` lines that named `RecommendationStrategy`/
   `SubscriptionPlan-as-interface`, which don't exist. Replaced `StreamingService`/
   `RecommendationEngine`/`DownloadManager`/`SubscriptionManager` with the real
   `MusicStreamingService`/`RecommendationService`/`SubscriptionStrategy` family, and corrected
   every model (`User`/`Song`/`Playlist`/`Subscription`) to its real id-referencing, zero-method
   shape (e.g. `Song.artistId`/`albumId`, not embedded `Artist`/`Album` objects). Added a
   `MusicStreamingService` facade node to the class diagram, which had never shown it at all.
4. **coffee** — targeted fix. Replaced a fabricated `CoffeeRepository` (asserted real,
   constructor-injected, with `getBeverages()`/`getMachine()`/`addOrder()`) — the module has no
   repository package; state lives directly on the `CoffeeMachine` model, constructed with `new`
   inside `CoffeeMachineService` — with the two patterns the module actually centers on and had
   never listed: Decorator (`CoffeeComponent`/`CoffeeDecorator`) and Factory (`CoffeeFactory`).
5. **social-network** — one-line fix. `diagrams/social-network.js` declared a standalone
   `FriendRequestStatus` enum class; the real type is `FriendRequest`'s private nested `Status`
   enum. Renamed to match, following the same bare-name + `stereotype: 'private nested ...'`
   convention `ttl-cache`'s `CacheEntry` already uses for a private nested class.
6. Verified with both audit scripts (all five modules clean; remaining flags are the same
   already-triaged nested-type false positives: `CacheEntry`, `PaymentStatus`,
   `StockMovementType`, `FareEstimate`, `SortTask`, plus each fixed file's own historical fix-note
   comment naming the old fabricated term) and `npx vitest run` (304/304, including
   `designDataCoverage.test.js`'s 291 cases — no dangling diagram edges, no duplicate barrel keys).

### 6. Preventative Measures
1. **The two-pass audit script is now the reusable tool for this class of bug** — run it after any
   future bulk content pass, not just when a report or accidental read surfaces one instance. Pass 1
   (structured `entities[]`/`classes[]` names, nested types included) and Pass 2 (role-suffixed
   identifiers in prose, checked against a *global* cross-module type registry, hypothetical
   language excluded) are complementary — each catches defects the other misses, as concert-ticket's
   fabricated `Booking`-model *methods* (invisible to a class-name check, since `Booking` is a real
   class name) versus cricinfo's `ScoringService` (invisible to a structured check, since it only
   ever appeared in prose) demonstrate.
2. **A module's class diagram and its design details are two independently-written documents that
   can silently diverge** — cricinfo's and concert-ticket's diagrams described (in cricinfo's case,
   correctly) a different architecture than their own design-details prose, and nothing ever
   cross-checked the two against each other. Whoever authors design-details prose for a module
   should read that module's own `diagrams/{module}.js` first, not just the Java source — it is
   often already correct and is the faster ground truth to check against.
3. A file can be **mostly accurate with one fabricated class stitched in** (coffee's real
   Decorator/Factory/State entities plus one invented `CoffeeRepository`) just as easily as it can
   be wholesale fabricated (cricinfo, music-streaming, concert-ticket) — "most of this module's
   design doc checks out" is not evidence the rest does; the automated sweep has to check every
   entity, not stop once the first few resolve correctly.

### Addendum (same day) — a third audit pass caught 2 more, in a reference module
Preventative measure #3 above was tested immediately: a third pass was added to the audit script,
checking whether every method attributed to an entity/class in `diagrams/*.js` + `design/*.js`
actually appears anywhere in that module's real `.java` source — not just whether the class name
exists, which is what let concert-ticket's/cricinfo's fabricated model methods slip past pass 1.
Run across all 45 modules, it flagged exactly two real findings, both in **splitwise** — one of the
three official reference modules everything else is told to match:
- `design/splitwise.js` called `SplitwiseService`'s balance-lookup method `getUserBalances(userId)`;
  the real method is `getBalances(userId)`.
- `Group` (a plain `@Data` model) was documented with an `addMember(user)` method that doesn't
  exist — group membership is added through `SplitwiseService.addMemberToGroup(groupId, userId)`,
  which the design doc never mentioned at all. Fixed both, and added the missing method to
  `SplitwiseService`'s own entry rather than just deleting the wrong one.

Confirms preventative measure #3: even the reference module used as the standard for every other
module's "did you actually check the source" review had gone unchecked itself. The method-level
pass is now the standing third stage of this audit, alongside the two from the main entry above.

## RCA-045: The `usePolling` Adoption Gap Was Closed by Auditing Which of the 21 Missing Modules Actually Have Shared Live State, Not by Adding It to All 21

### 1. Overview & Severity
**Severity: Low (documentation/completeness gap, not a defect).** A 30 Aug audit found only
13/45 pages used the shared `usePolling` hook and scoped the gap out of "full completion" as a
separate future pass; a 31 Aug follow-up found the number had drifted to 24/45 incidentally (a
side effect of PR #58's `fetch()` → `apiFetch` cleanup, not a dedicated pass). This entry is that
dedicated pass. Rather than mechanically adding `usePolling` to the remaining 21 pages, each was
checked for whether it actually has state another (simulated) actor can mutate while the page sits
open — the same "does this pattern claim have real supporting evidence" discipline RCA-044 applied
to design docs. 6 of the 21 did; the other 15 legitimately don't, and adding polling to them would
have been dead weight, not progress.

### 2. Symptoms & Error Logs
None — this was never a bug. The symptom was purely a documentation/completeness gap: a module
whose booking/feed/catalog state can change from another user's action had no way to reflect that
change without a manual page reload, unlike its sibling modules (`movieticket`, `parking`,
`concert-ticket`, etc.) that already poll.

### 3. Root Cause
`usePolling` adoption had only ever grown as an incidental side effect of other work (new modules
being built with it from the start, or an unrelated cleanup pass happening to touch a page that
already needed it) — no pass had ever gone through the specific list of pages missing it and asked,
module by module, "does this one actually need it." Without that check, the two obvious wrong moves
are equally available: leaving a real gap unclosed (an airline seat map that never reflects another
customer's hold) or mechanically wrapping every remaining page in a 5-second poll regardless of
whether it has any shared state to observe (a concurrency primitive's one-shot trace replay, a
single-browser two-player board game, an ATM session against the user's own account).

### 4. Diagnostic Commands
```bash
# Which pages already use the hook:
grep -rl "usePolling" frontend/src/lld/*/*Page.jsx | wc -l   # was 24

# For each page WITHOUT it, is there a GET endpoint returning state another actor could have
# just mutated (seat/room/spot availability, a feed, pending requests, stock levels) — as
# opposed to a page whose only state changes are triggered by the current user's own request/
# response cycle?
grep -L "usePolling" frontend/src/lld/*/*Page.jsx
```

### 5. Step-by-Step Resolution
Categorized the 21 pages missing `usePolling`:

- **6 genuine gaps, closed:**
  - `airline` — seat map polls every 4s (mirrors `movieticket`/`concert-ticket`); deliberately
    doesn't touch `selectedSeats` on each poll tick, so a background refresh can't clear what the
    current user has mid-selected.
  - `hotel` — the selected hotel's room grid polls every 5s.
  - `linkedin` — pending connection requests/notifications/connections poll every 5s; an open
    conversation polls every 3s like a live chat.
  - `library` — book availability polls every 6s, **skipped while a search filter is active** (the
    same `books` state array holds both the full catalog and search results — polling through a
    search would have silently reverted it to the unfiltered catalog every few seconds); the
    selected member's notifications poll every 6s.
  - `shoppingcart` — the catalog polls every 6s (stock, not the user's own cart, is the shared
    state here).
  - `social-network` — the timeline feed and the friends/pending-requests view both poll every 5s.
- **15 correctly left alone, N/A:**
  - The 9 concurrency primitives (`blocking-queue`, `bloom-filter`, `concurrent-hashmap`,
    `fizz-buzz`, `foo-bar`, `h2o`, `merge-sort`, `ttl-cache`, `zero-even-odd`) — each is a
    synchronous `POST /run` returning a complete trace immediately; there is no ongoing server-side
    state between requests to poll.
  - The 5 board/puzzle games (`chess`, `ludo`, `minesweeper`, `snakeladders`, `tictactoe`) —
    single-browser session, every state change is triggered by the current user's own move; no
    other actor mutates shared state this browser needs to observe passively.
  - `atm` — a single session against the current user's own account; nothing else mutates it while
    the page is open (the concurrent-withdrawal race lives entirely in the isolated `/sim/*` tab,
    which already drives its own step-by-step UI, not a background poll).

Every added `usePolling` call follows the existing convention exactly: a plain closure (not
threading the hook's `AbortSignal` through to `apiFetch`, since no existing call site does either),
`.then(setState).catch(() => {})` with no error surfaced to the banner (a poll failing silently is
correct — the page already loaded once via its normal `useEffect`), and a `deps` array scoped to
whatever selection the poll target depends on. Verified with `npx vitest run` (304/304, unchanged —
this is pure additive frontend wiring, no new component logic under test) and `npm run build`
(entry chunk 260.79 kB, unchanged, still under the 500 kB gate).

Updated `AGENTS.md`: fixed two now-stale claims ("the page has no polling loop, so `usePolling`
doesn't apply here") in the `linkedin` and `library` sections that were accurate when written
(RCA-037, 30 Aug) but no longer are, plus added one-line notes to `airline`/`hotel`/`shoppingcart`/
`social-network`'s Frontend sections.

### 6. Preventative Measures
1. **A "should X apply to every module" gap is closed by auditing each candidate, not by
   mechanically applying X everywhere.** 6 real fixes plus 15 correctly-excluded modules is a
   complete, defensible answer; blanket-adding polling to concurrency primitives and local games
   would have been strictly worse than leaving the gap open, since it adds runtime cost and false
   affordance (a refresh cadence implying live shared state that doesn't exist) for zero benefit.
2. **A naive "wrap the existing fetch in `usePolling`" refactor can silently break a page that
   reuses one state variable for two purposes.** `library`'s `books` state holds both the full
   catalog and search results from the same setter; a poll with no guard would have fought the
   user's own search every few seconds. Any future polling addition should check whether the
   state it's about to refresh is exclusively owned by the "background" data path before wiring a
   poll to it.
3. `AGENTS.md`'s per-module notes are precise enough to describe the absence of a capability
   ("the page has no polling loop, so `usePolling` doesn't apply here") — which is good, specific
   documentation right up until the capability is added and the note becomes silently wrong. A
   grep for the phrase "doesn't apply" or "not yet" across `AGENTS.md` (the same technique RCA-043's
   preventative measure #1 recommended for source comments) is worth running whenever a
   previously-scoped-out capability gets added to a module, to catch exactly this class of drift.

## RCA-046: A Fourth Audit Pass (Field-Level) Found 4 More Modules With Fabricated Fields, and Its Own First Draft Produced 379 False Positives From Three Regex Gaps

### 1. Overview & Severity
**Severity: Low-Medium.** RCA-044/045 closed the two gaps an earlier status check had flagged as
open (systematic content-accuracy audit, `usePolling` adoption); this entry is the deeper follow-up
that same status check named as the next lowest-confidence area: "field/method-type-level accuracy
beyond what's been checked." RCA-044's three passes verify that a *name* (class, prose-mentioned
role, method) exists in the real source; none of them checks whether a *field* attributed to a real
class is itself real. A fourth pass closing that gap found genuine fabrications in 4 modules —
**atm** (a field describing a resolved strategy instance where the real code holds a factory and
resolves fresh per call), **uber** (three rate constants invented on `UberService` that actually
live on the `VehicleType` enum, entirely undocumented as an entity), **logging-framework** (one
field misnamed), plus two prose-shorthand ambiguities in **cricinfo**/**ttl-cache** tightened for
precision. It also produced 379 raw flags across 37 modules on its first run, of which all but the
4 real ones and 2 minor prose fixes were the script's own bugs, not the content's.

### 2. Symptoms & Error Logs
None — same as RCA-044/045, this was never a runtime defect. The tell was purely
`grep -c EventType\|RunResult\|TraceEvent` returning near-universal false positives across every
concurrency-primitive module on the first run, which is what triggered debugging the script itself
rather than trusting its output.

### 3. Root Cause
Three independent gaps in the pass-4 field-extraction script, each large enough on its own to make
the raw output unusable without a fix:
1. **Java `record` components aren't field declarations.** `public record TraceEvent(long sequence,
   String threadName, ...)` declares its fields in the type header, not as `private Type name;`
   statements in the body — the regex built for pass 1's class-existence check (and reused
   unmodified for field extraction) never looks there. Every concurrency primitive's `TraceEvent`/
   `RunResult`/`RunRequest`/`PutSpec`/`GetSpec` records are real classes built this way, so this one
   gap alone produced roughly 150 of the 379 flags.
2. **Javadoc comments between enum constants break naive comma-splitting.** `enum EventType {
   /** doc */ NUMBER_ATTEMPT, /** doc */ NUMBER_PRINTED }` — splitting the captured `{...}` body on
   `,` and taking each token's first whitespace-separated word grabs `/**` (part of the previous
   constant's trailing comment) instead of the next constant's real name, whenever a constant has a
   javadoc comment before it. Comments were never stripped before parsing.
3. **`"implements X"` / `"extends X"` entries in a `fields[]` array document inheritance, not a data
   field** — e.g. `'implements TariffStrategy'` on a concrete strategy class. The first draft
   stripped the `implements `/`extends ` prefix and then treated the remaining interface name as a
   field to verify, which of course fails (it's a class name pass 1 already checked, not a field).
   This alone produced ~40 flags across every module using the `implements X` field-array
   convention (hotel, splitwise, movieticket, parking, restaurant, shoppingcart, stockbroker,
   traffic-signal, linkedin, pubsub).

After fixing all three (strip comments before parsing; parse record-header components as fields;
skip `implements`/`extends` entries entirely rather than mis-parse them), the raw flag count dropped
from 379 across 37 modules to 36 across 13 — the actually-worth-triaging set.

### 4. Diagnostic Commands
```bash
# Field-level check: does every field on entities[]/classes[] exist in the module's real source
# (as a declared field, a record component, or an enum constant)?
node audit4.mjs   # see session transcript / RCA history for the full script

# The three bugs that inflated the first run's output, in isolation:
grep -n "record\s" backend/src/main/java/com/lld/**/model/*.java   # gap 1: record components
grep -n "/\*\*" backend/src/main/java/com/lld/**/model/*.java      # gap 2: javadoc'd enum constants
grep -n "'implements \|'extends " frontend/src/data/{diagrams,design}/*.js   # gap 3: inheritance-as-field
```

### 5. Step-by-Step Resolution
1. **atm** — `CashDispenser`'s documented `dispenseStrategy: DenominationDispenseStrategy` field
   (implying one pre-resolved strategy held on the instance) replaced with the real
   `strategyFactory: DenominationDispenseStrategyFactory` (resolved fresh per `dispenseCash(amount,
   mode)` call via `strategyFactory.forMode(mode)`) plus the previously-undocumented `defaultMode:
   DispenseMode` field.
2. **uber** — removed three fabricated constants (`RATE_GO`/`RATE_XL`/`RATE_PREMIUM`) from
   `UberService`'s fields; the real per-km rates (12.0/18.0/25.0) live on the `VehicleType` enum's
   constructor arguments, resolved via `getPerKmRate()` — added `VehicleType` as its own design
   entity (it existed in the class diagram already, just not in design details prose) and corrected
   `estimate()`'s description to name the real source.
3. **logging-framework** — `FileAppender.maxBytes` → `maxBytesPerFile`, its real field name.
4. **cricinfo/ttl-cache** — two prose-shorthand field-name entries tightened from ambiguous
   contractions (`strikerName/Runs/Balls, bowlerName/Figures`; `MIN/MAX_SWEEP_INTERVAL_MILLIS`) to
   their unambiguous real names, since the shorthand form doesn't textually contain any single real
   field name.
5. Everything else across the remaining 25 flags (bloom-filter, chess, inventory, minesweeper,
   shoppingcart, stackoverflow, task-management, tictactoe, ttl-cache's `CacheEntry`) was manually
   confirmed real and left unchanged: package-private `static final` constants/fields (no visibility
   modifier — a fourth script gap identified but not worth fixing, since every instance was already
   individually verified by hand), 2D-array fields (`Type[][] name` — the field regex's optional
   `(?:\[\])?` only matches a single bracket pair), and one intentional documentation pattern
   (`shoppingcart`'s `CartCommand` entity uses its `fields[]` array to summarize each of its three
   implementations' `undo()` behavior rather than list data fields — unconventional but not
   inaccurate).
6. Verified with `npx vitest run` (304/304) and `npm run build` (entry chunk 260.79 kB, unchanged,
   under the 500 kB gate).

### 6. Preventative Measures
1. **A verification script's own bugs can outnumber the real findings by two orders of magnitude**
   — 379 raw flags, 4 real ones. The fix was the same discipline RCA-044 itself argued for: never
   trust a scan's raw output as a verdict, triage every flag against the actual source before
   acting on it. Here that triage revealed the script needed fixing, not the content — a useful
   reminder that a high flag count is a signal to debug the *tool* first, not to start editing
   content to match it.
2. **A regex built for one purpose (class-name existence) silently under-serves a related but
   different purpose (field existence)** when reused unmodified — `record` components, javadoc'd
   enum bodies, and `implements`/`extends` field-array entries are all edge cases pass 1 never had
   to handle (it only checked type *names*, never their internals). Each new audit layer needs its
   own edge-case pass over a representative sample before trusting it across all 45 modules, not
   just a copy-paste of the previous pass's extraction logic.
3. The now-4-pass audit script (name existence → prose role-suffix → method existence → field
   existence) is the complete reusable toolkit for this class of documentation-accuracy issue;
   future content edits to `diagrams/*.js`/`design/*.js` should be spot-checked against it, not just
   `designDataCoverage.test.js` (which only proves ids resolve and diagram edges aren't dangling —
   it has no opinion on whether the described fields/methods/classes are real).

## RCA-047: A Static UI/UX Pass (No Browser Available) Found 15 Instances of Mouse-Only Interaction and 2 Dead Click Handlers Across 12 Modules

### 1. Overview & Severity
**Severity: Low-Medium (accessibility/polish, not a functional defect).** The one quality gate this
session's status checks had never audited — "does the actual page UI hold up, not just the backend
and docs" — was the last one requested. No screenshot/browser-automation tool is available in this
environment, so this was scoped as a static source audit: things a screenshot isn't needed to catch
(keyboard accessibility, dead/misleading interaction affordances, swallowed user-action errors),
explicitly excluding visual judgment (spacing, color harmony, layout) that genuinely needs a
rendered page. Found 15 mouse-only clickable elements with no keyboard path across 12 modules, and
2 elements that were visually styled as clickable but did nothing when clicked.

### 2. Symptoms & Error Logs
None — same as this session's other audit passes, this predates any bug report. The tell for the
keyboard-access gap is structural: a `<div onClick={...}>` with no `role`, `tabIndex`, or
`onKeyDown` is invisible to Tab navigation and screen readers, but renders and behaves identically
to a real button for a mouse user — nothing about it looks broken.

### 3. Root Cause
- **Clickable `<div>`s instead of `<button>`s for card-style selection UI.** Ten modules'
  "pick one of these cards" pattern (auction/car-rental/digitalwallet/hotel/lru-cache/
  social-network/splitwise ×2/stackoverflow/uber ×2) used a bare `<div onClick={...}>` for a
  grid of selectable cards — a `<button>` wrapping the same content would have gotten focusability,
  keyboard activation and the correct accessibility role for free, but the div-with-onClick pattern
  (chosen for layout/styling flexibility, matching every sibling card in the same grid) doesn't.
  Same root shape for chess's and minesweeper's board-cell grids.
- **Copy-paste inconsistency on a decorative element.** Every module's step-progress-dot indicator
  (chess/hotel/parking/etc.) renders a plain, non-interactive `<div>` — except `splitwise`'s, which
  carried a stray `onClick={() => {}}` no other module's copy of the same component has. A no-op
  handler on an element with `cursor: pointer` styling makes it *look* interactive when it never
  was — worse than not having the handler at all, since it invites a click that does nothing.
- **A shared component's `onClick` prop was always wired up, even where the caller had nothing for
  it to do.** `task-management`'s `TaskCard` unconditionally attached
  `onClick={() => onClick(task)}` and unconditionally carried `cursor: pointer` styling. Its real
  use (the live board) always passes a working handler; its second use (the simulation tab's
  read-only board preview) passed `onClick={() => {}}` just to satisfy the prop — so simulation-tab
  cards looked exactly as clickable as real ones (same hover-lift, same pointer cursor) while doing
  nothing on click, right next to a real board where clicking opens a detail view.

### 4. Diagnostic Commands
```bash
# Mouse-only clickable divs — no role, so no keyboard path and no accessibility-tree exposure:
grep -rn "<div[^>]*onClick" frontend/src/lld/*/*.jsx | grep -v "role="

# A no-op handler on an interactive-looking element — grep for the shape, then read each hit's
# surrounding component to see if it's genuinely meant to do nothing (rare) or a stale copy/paste:
grep -rn "onClick={() => {}}" frontend/src/lld/*/*.jsx

# Whether a user-initiated action's failure ever reaches the user (vs. a background poll/initial
# load, which should legitimately fail silently) — read each match's surrounding function, don't
# judge from the grep line alone:
grep -rnE "\.catch\(\s*\(\s*[a-zA-Z_]*\s*\)\s*=>\s*\{\s*\}\s*\)|catch\s*\(?[a-zA-Z_]*\)?\s*\{\s*\}" frontend/src/lld/*/*.jsx
```

### 5. Step-by-Step Resolution
1. **11 clickable selection cards** (`auction`, `car-rental`, `digitalwallet`, `hotel`,
   `lru-cache`, `social-network`, `splitwise` ×2, `stackoverflow`, `uber` ×2) — added `role="button"`,
   `tabIndex={0}`, and an `onKeyDown` firing the identical handler on Enter/Space; added
   `aria-pressed` on the three that track a "selected" boolean.
2. **2 board-cell grids** (`chess`, `minesweeper`) — same treatment, gated on chess's existing
   `interactive` flag so a non-interactive board (e.g. mid-simulation) doesn't falsely announce
   itself as focusable; added `aria-label`s describing each cell's state; minesweeper's right-click
   flag action got a keyboard fallback (`f`/`F` while a cell is focused), reusing the exact
   `handleFlag(e, row, col)` handler the context-menu path already calls (verified it only calls
   `e.preventDefault()` on the event, so passing a `KeyboardEvent` instead of a `MouseEvent` is
   safe).
3. **`splitwise`'s dead step-dot handler** — removed `onClick={() => {}}`, matching every other
   module's identical (and genuinely non-interactive) step-dot component.
4. **`task-management`'s `TaskCard`** — `onClick` is now optional; the click affordance (cursor,
   hover-lift) only applies via a new `.tm-card-clickable` class when a real handler is passed. The
   simulation tab's read-only board preview now renders `<TaskCard ... />` with no `onClick` prop at
   all instead of a no-op — cards there correctly look inert rather than falsely clickable.
5. **`task-management`'s Add Task modal** — had click-outside-to-close but no Escape-key support
   (the standard second half of that pattern). Added a `keydown` listener scoped to when the modal
   is open.
6. Everything else checked came back clean, not just unexamined: zero `console.log` leftovers, zero
   raw `<img>` tags (so no missing-`alt` class of bug exists at all), and every `.catch(() => {})` /
   empty-catch instance found across the whole `frontend/src/lld` tree was read in context and
   confirmed to be either (a) a background poll or initial page-load fetch — correct to fail
   silently, since a poll surfacing an error banner every few seconds would be worse UX than the
   status quo — or (b) already surfaced to the user upstream (`task-management`'s `runAction`
   `toast.error()`s before rethrowing; the outer `.catch(() => {})` on its callers just silences
   the resulting unhandled-rejection warning after the user has already seen the toast) —
   `movieticket`'s one `catch (ignored) {}` is a scripted simulation step where the rejection is the
   deliberately-narrated demo outcome, not a swallowed real error.
7. Verified with `npx vitest run` (304/304) and `npm run build` (entry chunk 260.79 kB, unchanged,
   under the 500 kB gate) after every edit.

### 6. Preventative Measures
1. **A `<div>` styled and behaving like a button needs the same three things every time**: `role`,
   `tabIndex`, and an `onKeyDown` mirroring the `onClick`. The grep in section 4
   (`onClick` without a same-line `role=`) is cheap enough to run on any future module's page before
   it's considered finished, rather than relying on remembering the convention per-file.
2. **A shared component should never carry a click affordance (cursor, hover states) that isn't
   backed by a real handler.** `TaskCard`'s bug — and `splitwise`'s step-dot bug — are the same
   shape: an interactive-looking element with nothing behind it. Prefer making the prop optional and
   gating both the handler *and* the styling on its presence, the way `TaskCard` now does, over
   passing a no-op just to satisfy a required prop.
3. **This was a source-only audit, not a visual one** — no browser/screenshot tool is available in
   this environment, so spacing, color harmony, responsive layout, and anything else that requires
   actually seeing the rendered page was explicitly out of scope and remains unverified. If a visual
   UI/UX pass is ever wanted, it needs either a screenshot-capable tool added to the environment, or
   a human doing the actual look-and-feel review with this RCA's findings as the starting checklist.

## RCA-048: 13 of 45 README "Project Details" Sections Were Never Written, and 3 Table Links (Including 2 Pre-Existing Ones) Pointed at the Wrong Anchor

### 1. Overview & Severity
**Severity: Low (documentation completeness, not a defect in the product itself).** A user question —
"why do some LLD questions have links in the README and others don't" — surfaced that the
"Projects Overview" table's per-row link isn't cosmetic: it points at a `### N. Name` deep-dive
section (Key Features + API Endpoints) further down the README, and 13 of the 45 modules never had
that section written at all, so there was nothing to link to. A 14th case (Chess) had the opposite
problem — the section existed but the table row was plain text, never wired to it. Verifying every
link's anchor against its actual heading (not just "is there a link") turned up 2 more,
**pre-existing**, silently broken links unrelated to the missing-section problem.

### 2. Symptoms & Error Logs
None runtime — a broken or absent Markdown anchor link doesn't error, it just does nothing (GitHub
scrolls to the top of the page, or nowhere, depending on renderer). The only way to see the defect
was to check, for all 45 table rows, that a real matching `###` heading exists and that the link's
`#anchor` text is byte-identical to what that heading actually slugifies to.

### 3. Root Cause
- **The README's per-module deep-dive section was authored progressively, not backfilled.** As
  modules were raised to the reference bar over many sessions, most got a `### N. Name` write-up
  added to the README at the same time. 13 didn't: `Hotel Management` (12), `Logging Framework`
  (22), `Traffic Signal` (23), `Restaurant Management` (30), and all 9 concurrency primitives
  (37–45) — every one of them fully real and reference-bar-verified as of this session's earlier
  RCA-044/045/046 passes, just never written up in this specific document.
- **Chess's link was dropped independently of the missing-section problem** — its section
  (`### 16. Chess`) exists and is complete; the table row simply was never turned into a link when
  the row was added, unlike its neighbors.
- **Two more table links (`Elevator`, `Movie Ticket Booking`) were already broken before this
  session touched the file** — each links to a *shortened* anchor (`#9-elevator`,
  `#11-movie-ticket-booking`) that drops the qualifying suffix (` System`, ` (BookMyShow)`) the real
  heading actually has (`### 9. Elevator System`, `### 11. Movie Ticket Booking (BookMyShow)`).
  Both were only found by mechanically slugifying every heading and diffing it against every link's
  anchor text — eyeballing the table (both look like reasonable trimmed labels) doesn't surface it.

### 4. Diagnostic Commands
```bash
# Every table row's link target vs. every section heading's real GitHub-slugified anchor, checked
# programmatically rather than by eye (GitHub's slugger: lowercase, strip everything but word
# chars/hyphens/spaces, spaces -> hyphens, NO collapsing of repeated hyphens):
python3 - <<'PY'
import re
text = open("README.md", encoding="utf-8").read()
def slugify(h):
    s = re.sub(r'[^\w\- ]+', '', h.lower())
    return s.replace(' ', '-')
headings = {m.group(1): slugify(f"{m.group(1)}. {m.group(2)}")
            for m in re.finditer(r'^### (\d+)\. (.+)$', text, re.M)}
for num, label, anchor in re.findall(r'\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(#([^)]+)\)', text):
    real = headings.get(num)
    if real != anchor:
        print(f"row {num} ({label}): links to #{anchor}, real anchor is #{real}")
PY

# Every table row with no link at all, and every N with no matching section:
grep -oE '^\| [0-9]+ \| [^\[|]' README.md            # unlinked rows (plain text, no `[`)
comm -3 <(seq 1 45) <(grep -oE '^### [0-9]+' README.md | grep -oE '[0-9]+' | sort -n)  # missing sections
```

### 5. Step-by-Step Resolution
1. Wrote the 13 missing `### N. Name` sections (Key Features + API Endpoints, matching every
   existing entry's exact format), grounded in real source for each:
   - `Hotel Management`, `Logging Framework` — condensed from their existing, already-verified
     `AGENTS.md` sections.
   - `Traffic Signal`, `Restaurant Management` — grounded in their `frontend/src/data/design/*.js`
     files (rewritten from real source and independently audited earlier this session).
   - All 9 concurrency primitives — grounded directly in their real synchronization-primitive
     fields (verified by `grep`, e.g. confirming `FooBarPrinter`'s two `Semaphore` fields,
     `H2OBonder`'s `Semaphore`s + 3-party `CyclicBarrier`, `StripedHashMap`'s per-segment
     `ReentrantLock[]`) and each controller's real single `POST /api/concurrency/{name}/run`
     endpoint (confirmed via `grep @PostMapping` — every one of the 9 has exactly one real HTTP
     endpoint, matching their "synchronous trace-returning run" architecture established in
     RCA-045).
2. Inserted each in numeric position among the existing sections (Hotel between 11/13, Logging
   Framework + Traffic Signal between 21/24, Restaurant Management between 29/31, the 9 primitives
   appended after 36 — continuing the file's existing "appended later, out of strict order" pattern
   already used for sections 15/16/17/20/26).
3. Linked all 13 new sections' table rows, plus Chess's pre-existing section, plus fixed the 2
   silently-broken pre-existing links (`Elevator` → `#9-elevator-system`, `Movie Ticket Booking` →
   `#11-movie-ticket-booking-bookmyshow`).
4. Verified programmatically (not by eye) that all 45 table rows now link to a real, byte-identical
   anchor, all 45 `### N.` sections exist exactly once each numbered 1–45 with no duplicates or
   gaps, and re-ran `npx vitest run` (304/304 — expected no change, since this is a Markdown-only
   edit with no code path touching it).

### 6. Preventative Measures
1. **A documentation "table of links" is a real cross-reference, not decoration — verify it the
   same way code cross-references get verified.** The same discipline RCA-044's audit scripts
   applied to `diagrams/*.js`/`design/*.js` (does the referenced thing actually exist, byte for
   byte) applies here: eyeballing "does this row have a `[...]`" would have caught the 13 missing
   sections and Chess, but would never have caught the 2 pre-existing broken anchors, which look
   completely normal without slugifying both sides and diffing.
2. **A README's per-module section list should be added in the same commit that raises that module
   to the bar**, not treated as separate documentation debt — 13 modules going fully real without a
   corresponding README write-up is exactly the kind of gap that compounds silently until a user
   notices the table looks inconsistent.
## RCA-049: Every Traffic Signal Endpoint Returned HTTP 500 — `Intersection` Exposed a Bean-Property-Less Field to Jackson, and No Test in the Suite Serializes a Response Body

### 1. Overview & Severity
**Severity: High (every production `traffic-signal` endpoint was unusable — a live-demo-breaking
defect, though scoped to one module).** Loading the module's "App" tab surfaced a generic
`⚠ Internal Server Error` banner with a Retry button that only ever retried into the same failure.
`GET /api/traffic/status` — and, by the same code path, every other endpoint that returns an
`Intersection` (`/intersections`, `/intersections/{id}`, the emergency/resume/manual-transition
endpoints, and the `/sim/*` snapshot) — threw during Jackson serialization of the response body,
after the handler method itself had already run successfully. `mvn test`'s full 1657-test green
suite gave no signal that this module was broken, because nothing in it exercises an HTTP response
body through real JSON serialization.

### 2. Symptoms & Error Logs
Curling the running backend directly (the frontend only ever saw the generic `Internal Server
Error` reason phrase, not the real cause — see Preventative Measures):
```
$ curl -s http://localhost:59190/api/traffic/status
{"timestamp":"2026-09-01T20:01:21.176+00:00","status":500,"error":"Internal Server Error",
 "message":"Type definition error: [simple type, class com.lld.trafficsignal.observer.SignalChangeNotifier]",
 "path":"/api/traffic/status"}
```
This is Jackson's `InvalidDefinitionException` — "no serializer found ... and no properties
discovered to create BeanSerializer" — thrown *after* `TrafficController.getStatus()` returned
normally, when Spring MVC tries to write the `Intersection` object to the response body.

### 3. Root Cause
`Intersection.getNotifier()` is a public getter returning `SignalChangeNotifier` — internal
Observer-pattern wiring used only so `Intersection.tick()`/`manualTransition()`/
`requestEmergencyOverride()` can publish phase-change events to `TrafficSignalService`'s observer
list. `SignalChangeNotifier` itself has exactly one field (`observers`, a `CopyOnWriteArrayList`,
private, no getter) and one method that looks like a getter but isn't named like one
(`observerCount()`, not `getObserverCount()`). Jackson's default bean introspection finds *zero*
serializable properties on it and refuses to guess — by design, since silently emitting `{}` for
an object with real (if inaccessible) state is its own kind of misleading.

Because `getNotifier()` was a plain public getter with no `@JsonIgnore`, every `Intersection`
serialized in a response body — which is every non-void `traffic-signal` endpoint — carried this
field into Jackson's reach and failed. The getter exists purely for `TrafficSignalService` to wire
`registerObserver()` on the sim sandbox's fresh notifier after `simReset()`; it was never meant to
leave the service layer, but nothing marked that boundary.

**Why the test suite didn't catch it — the actual gap:** every `trafficsignal` test
(`IntersectionTest`, `TrafficSignalServiceTest`, `TrafficSignalConcurrencyTest`,
`TrafficRepositoryTest`, `SignalStateTest`, `SignalTickerTest`) calls service/domain methods
directly in-process and asserts on the returned Java objects — none of them go through Spring MVC
or Jackson at all, so a getter that is perfectly valid Java and perfectly reachable in a unit test
is invisible to them. The one place in the whole backend that does exercise a real HTTP round trip,
`ErrorContractIntegrationTest` (`@SpringBootTest` + `MockMvc`), only asserts the *error* path
(a handful of 404s, for airline/stockbroker/library) — never a 200 OK happy-path body, for any
module, traffic-signal included. Checking across all 45 modules: **zero** `*ControllerTest.java`
files exist, and MockMvc is used nowhere else in the suite. The project's mandated "four test
flavours" (service, strategy, repository, concurrency — see `/lld-tests`) simply has no fifth
flavour that would round-trip a response body through the same Jackson `ObjectMapper` Spring uses
in production. This isn't unique to traffic-signal: any module whose domain object exposes a
bean-property-less nested field the same way has the identical blind spot today.

### 4. Diagnostic Commands
```bash
# Reproduce directly against a running backend (bypasses the frontend's misleading banner text):
curl -s http://localhost:59190/api/traffic/status | python3 -m json.tool

# Confirm no controller test exists anywhere in the suite:
find backend/src/test -iname "*ControllerTest.java"        # -> (nothing)
grep -rl "MockMvc" backend/src/test/java                   # -> only ErrorContractIntegrationTest

# Confirm every trafficsignal test stays in-process, never touching Jackson/MVC:
grep -n "MockMvc\|ObjectMapper\|@SpringBootTest" backend/src/test/java/com/lld/trafficsignal/*.java
                                                             # -> no matches
```

### 5. Step-by-Step Resolution
1. Reproduced the 500 with a direct `curl` against the already-running backend (the user's browser
   only showed the generic reason phrase), which surfaced Jackson's real exception message —
   `Type definition error: [simple type, class ... SignalChangeNotifier]` — immediately naming the
   offending getter.
2. Confirmed `getNotifier()` is called only from `TrafficSignalService` (constructor wiring and
   `simReset()`), never from any test or controller code that needs it serialized — safe to hide
   from Jackson without touching any caller.
3. Annotated `Intersection.getNotifier()` with `@JsonIgnore` (`com.fasterxml.jackson.annotation`,
   already on the classpath via `spring-boot-starter-web`) and documented on the getter why: the
   notifier is wiring, not domain state, and has no Jackson-visible properties in the first place.
4. Recompiled (`mvn -o -q compile`) and re-ran the module's existing suite — passes unchanged,
   since none of it touches serialization; the real regression check is the `curl` round trip
   above, which now returns the intersection's actual `lights`/`activeIndex`/`emergencyActive`
   state instead of a stack trace.

### 6. Preventative Measures
1. **A green `mvn test` proves the domain logic works; it says nothing about whether the response
   body can be serialized.** Any module whose only tests are service/repository/domain-object unit
   tests has this exact blind spot for its entire public API surface. The fix here is local
   (one `@JsonIgnore`), but the gap is structural — worth a fifth test flavour (a thin
   `@SpringBootTest @AutoConfigureMockMvc` happy-path smoke test per module, asserting `status()
   .isOk()` plus a couple of `jsonPath` checks on the real production endpoints) rather than
   trusting `ErrorContractIntegrationTest`'s hand-picked error-path coverage to generalize.
2. **A getter that exists only for same-package/same-layer wiring should say so.** `getNotifier()`
   had no doc comment distinguishing "internal plumbing" from "domain state safe to expose" — the
   two look identical in Java. `@JsonIgnore` plus a javadoc note (added here) makes that boundary
   explicit at the declaration site instead of relying on every future caller to notice.
3. **The frontend's own error banner hid the actionable message.** `apiFetch` reads
   `body.error || body.message`; for an exception the `GlobalExceptionHandler` doesn't catch (this
   one wasn't a `DomainException`), Spring's default `/error` handler always populates `error` with
   the generic HTTP reason phrase ("Internal Server Error") and puts the real detail in `message` —
   so the banner showed the least useful of the two fields. `curl`-ing the endpoint directly, not
   the browser banner, is what actually diagnosed this; a broad `RuntimeException` handler is
   explicitly avoided per `CLAUDE.md` (it would swallow Spring's own request-parsing exceptions),
   so the fix is diagnostic habit, not a code change: for an unlabeled "Internal Server Error" with
   no other clue, `curl` the endpoint directly before trusting the UI's own error text.
### Addendum (same day) — the same investigation surfaced a second, unrelated bug in the same endpoint
Once `/api/traffic/status` was serializing again, a follow-up question ("what is the Cycle button
in the App tab expected to do?") turned up a second, independent defect one layer up in the same
`POST /api/traffic/transition` endpoint the Cycle button calls.

**Symptom:** the button is labeled "Cycle" (App tab) / "🔄 Next Signal Phase Cycle" (Simulation
tab — same backend call), and the endpoint's own doc comment claimed it "forces the main
intersection's overdue phase to advance immediately." The actual implementation just called
`Intersection.tick()` — a single one-simulated-second decrement, which only flips the light's
phase if that happens to be its last remaining second. With GREEN/RED holding for 8s and YELLOW
for its own fixed duration, the overwhelming majority of clicks produced no visible change
whatsoever, directly contradicting both the button's label and the endpoint's documented intent.

**Root cause:** `tick()` is the correct primitive for the *automatic* one-second production clock
(`ScheduledExecutorSignalTicker` already calls it every real second in the background) but was
reused, unchanged, for the *manual, on-demand* "skip to the next phase" control — two genuinely
different operations (advance by one second vs. force-complete the current phase) sharing one
method because nothing else existed yet.

**Fix:** added `Intersection.forceAdvancePhase()` — same locking discipline as `tick()`, same
emergency-override no-op guard, but calls the existing private `advance()` transition logic
directly instead of going through the countdown check. `TrafficController.transition()` now calls
this instead of `tick()`; `tick()` itself is untouched and still drives the real background clock.
Covered by two new `IntersectionTest` cases (immediate two-step GREEN→YELLOW→RED+next-GREEN
advance in two calls regardless of starting countdown; no-op during an emergency override) and a
new `TrafficControllerIntegrationTest` case asserting a single `POST /transition` changes the
active light's serialized phase.

**Preventative measure:** a method's name and its actual behavior drifting apart is easy to miss
when the method still "type-checks" — `tick()` was a perfectly reasonable name for the background
clock's use, and nothing forced a second look when it got reused for a differently-labeled,
differently-intended UI control. When a demo/manual control and an automatic background process
end up calling the identical method, that is itself worth a second look at whether they actually
want the same semantics.
### Addendum 2 (same day) — executing on this entry's own Preventative Measures found two more live instances, one of each kind
RCA-049's Preventative Measures #1 and #3 above were both acted on immediately rather than left as
advice:

**#1, checked directly:** grepped every module for a domain object exposing an internal
locking/wiring primitive via a public getter — the exact shape that broke traffic-signal. Found two
more, live:
- `Elevator.getLock()` (`ReentrantLock`) — not `@JsonIgnore`'d, and `GET /api/elevator/elevators`
  returns `List<Elevator>` directly, so every response leaked the lock's raw concurrency state
  (`locked`, `fair`, `queueLength`, `heldByCurrentThread`) into the JSON body.
- `Member.getLock()` (library) — same: not `@JsonIgnore`'d, 3 endpoints return `Member` directly.
- Notably, `Account` (atm), `Product` (shoppingcart), and `Account` (stockbroker) already
  `@JsonIgnore` their own lock getters — so this exact fix was already known and applied in three
  modules and simply missed in these two. `VendingMachine`/`CoffeeMachine` also have un-ignored
  lock getters but are never returned by any controller today, so they're dormant risk, not active
  leaks — left alone.
- Unlike `SignalChangeNotifier` (zero bean-visible properties, so Jackson threw),
  `ReentrantLock` has real bean-style getters (`isLocked()`, `isFair()`, `getQueueLength()`, etc.),
  so this variant doesn't 500 — it silently leaks internal concurrency state to every client
  instead. Fixed both with `@JsonIgnore`, each covered by a new
  `{Elevator,Library}ControllerIntegrationTest` asserting the `lock` field is absent from the
  response — the first controller-level test either module has ever had.

**#3, applied:** `apiFetch` (`frontend/src/utils/api.js`) read `body.error || body.message`. For
`GlobalExceptionHandler`'s `ErrorResponse` shape (`DomainException` etc.), `error` *is* the real,
specific reason and there is no `message` field, so this was correct there. But for any exception
nothing catches, Spring's default `/error` handler always fills `error` with the generic HTTP
reason phrase and puts the actual detail in `message` — exactly what happened here (RCA-049's main
entry: the browser only ever showed "Internal Server Error", never the real Jackson exception).
Flipped the precedence to `body.message || body.error`: `ErrorResponse` bodies have no `message`
field, so they fall through to `error` exactly as before; unhandled-exception bodies now surface
the actually-useful field. Verified against every hand-built `Map.of(...)` error/success body in
the backend (coffeemachine, vendingmachine, concertticket, movieticket, etc.) — none of them
regress under the new precedence, since none mix both keys in a way the old order depended on.

Confirms the pattern from the main entry's Preventative Measures: acting on "here's what else is
probably wrong" immediately, rather than filing it as a someday-list item, is what turned two of
three predicted gaps into actually-fixed code the same day.
## RCA-050: `backend/Dockerfile` Still Declared `EXPOSE 9190` After the Default Port Moved to 59190 — the Docker Path Was Never Actually Exercised to Catch It

### 1. Overview & Severity
**Severity: Low (metadata drift, not a live break).** The port-migration work (#71) moved the
backend's default port from `9190` to `59190` and updated `application.properties`,
`OpenApiConfig`, `vite.config.js`, `docker-compose.yml`, `nginx.conf`, `start.sh`, six frontend
error banners, and every doc reference — eight distinct file categories, all caught by an explicit
grep sweep at the time. `backend/Dockerfile`'s `EXPOSE 9190` line was not one of them; it was
never grepped because the sweep's file-extension filter (`--include="*.properties" --include="*.yml"
--include="*.js" ... --include="*.conf" --include="*.sh"`) has no entry for a file literally named
`Dockerfile`, which has no extension at all.

### 2. Symptoms & Error Logs
None observable through normal use. `EXPOSE` is Docker image metadata — it does not bind a port or
affect `docker-compose.yml`'s explicit `"${BACKEND_PORT:-59190}:59190"` mapping, which works
regardless of what the image declares. The only visible consequences are `docker inspect`, showing
port `9190/tcp` as exposed when the process inside actually listens on `59190`, and `docker run -P`
(Docker's "auto-publish every exposed port to a random host port" convenience flag) publishing the
wrong container port, mapping traffic to a port nothing is listening on.

### 3. Root Cause
The original port-migration sweep (#71) found every place a port number was hardcoded via:
```bash
grep -rln "9190" --include="*.properties" --include="*.yml" --include="*.yaml" --include="*.js" \
  --include="*.jsx" --include="*.json" --include="*.md" --include="*.sh" .
```
`Dockerfile` (both `backend/Dockerfile` and `frontend/Dockerfile`) matches none of those
`--include` patterns, since it's an extensionless filename, not a `*.something` pattern. The sweep
was thorough for every file type it was told to look at and silently blind to the one file type it
wasn't. `frontend/Dockerfile` happened to be unaffected only because it never hardcoded a port
number in the first place (`EXPOSE 80`, the nginx container's fixed internal port, deliberately
never changes per `docker-compose.yml`'s own documented design). `backend/Dockerfile`, which does
hardcode the backend's port, was not so lucky.

Compounding this: nothing in CI or local verification ever builds or runs the Docker images.
`ci.yml` runs `mvn test` and `npx vitest run` + `npm run build` directly on the host — never
`docker build` or `docker compose up`. So even after the miss, nothing would have caught it; the
Docker path is simply never exercised by anything in this repository's automation.

### 4. Diagnostic Commands
```bash
# The original sweep's blind spot, reproduced: Dockerfile matches no --include pattern used
grep -rln "9190" --include="*.properties" --include="*.yml" --include="*.js" --include="*.sh" .
# -> does not list backend/Dockerfile even though it contains "9190"

# The actual stale line:
grep -n "EXPOSE" backend/Dockerfile frontend/Dockerfile
# -> backend/Dockerfile:20:EXPOSE 9190        (stale)
# -> frontend/Dockerfile:16:EXPOSE 80         (correct — never changes by design)

# Confirms Docker itself isn't reachable from this WSL shell to verify a build directly:
docker version
# -> "The command 'docker' could not be found in this WSL 2 distro. ... activate the WSL
#     integration in Docker Desktop settings." (a one-time host machine setting, not a repo fix)
```

### 5. Step-by-Step Resolution
1. While reviewing "what else is unverified" after the RCA-049 line of fixes, re-examined
   `docker-compose.yml`, both `Dockerfile`s, and `nginx.conf` by eye (the same files touched by
   #71) rather than re-trusting the earlier grep's completeness.
2. Found `backend/Dockerfile:20` still reading `EXPOSE 9190` against every other file's `59190`.
3. Confirmed via a final grep pass across all four Docker-related files that this was the only
   remaining stale reference — `nginx.conf`'s two `proxy_pass` lines and `docker-compose.yml`'s two
   port mappings already correctly say `59190`/`53000`.
4. Fixed to `EXPOSE 59190`. Attempted to verify with an actual `docker build`, but Docker is not
   reachable from this WSL distro (`docker version` fails — WSL integration isn't enabled in Docker
   Desktop's settings, a host-machine configuration outside this repo's control). Verification is
   therefore static (byte-for-byte matching every other file's declared port) rather than a real
   build — flagged explicitly rather than claimed as tested.

### 6. Preventative Measures
1. **A file-extension `--include` filter is only as complete as its list of extensions — files with
   no extension at all (`Dockerfile`, `Makefile`, `Jenkinsfile`, `Procfile`) silently fall outside
   every pattern unless explicitly named.** A "find every place X is hardcoded" sweep should either
   grep every tracked file (`git grep`, `grep -r` with no `--include` filter at all, then exclude
   known-noisy paths like `node_modules`/`target`) or explicitly enumerate extensionless
   config-shaped filenames alongside the extension list. Filtering by extension is convenient but
   is exactly the kind of "was thorough for what it checked, blind to what it didn't think to
   check" gap that keeps recurring across this file's own history (RCA-046's regex gaps,
   RCA-048's un-slugified anchor comparison).
2. **The Docker deployment path has zero automated verification anywhere in this repository** —
   not in CI, not in any test, not in this session. `docker-compose.yml` and both `Dockerfile`s
   have been edited multiple times (#71, this entry) purely by static review of file contents,
   never confirmed against an actual `docker build`/`docker compose up`. This is a standing,
   undocumented gap: if Docker is ever made reachable in an environment doing this kind of review,
   an actual build-and-smoke-test pass over the compose stack would be worth doing at least once,
   rather than continuing to trust "the files look internally consistent" as a proxy for "this
   deploys."
## RCA-051: The New Uber `/sim/*` Engine Threw `NullPointerException` Instead of a Domain 404 When a Step Was Called Out of Order

### 1. Overview & Severity
**Severity: Low (caught before merge by the module's own test suite, never reached a real user).**
While building the isolated `/api/uber/sim/*` simulation engine (the fix for the audit finding that
Uber's Simulation tab was a frontend-only fake animation with no backend behind it), every
mutating sim endpoint (`simRace`, `simVerifyOtp`, `simArrive`, `simComplete`) looked up the current
sim ride the same way the rest of the codebase does: `simRepository.getRide(simRideId)`, followed
by `if (ride == null) throw new RideNotFoundException(...)`. That null check never ran — calling
any of these four endpoints before `simRequest` (which is what actually assigns `simRideId`)
produced a raw `NullPointerException` and a generic 500, not the intended domain 404.

### 2. Symptoms & Error Logs
`UberSimEngineTest.actingBeforeRequestThrowsDomainException` and
`UberControllerIntegrationTest.actingOutOfOrderIsADomainError` both failed on first run:
```
org.opentest4j.AssertionFailedError: Unexpected exception type thrown, expected:
<com.lld.uber.exception.RideNotFoundException> but was: <java.lang.NullPointerException>
	at com.lld.uber.UberSimEngineTest.actingBeforeRequestThrowsDomainException(UberSimEngineTest.java:197)
Caused by: java.lang.NullPointerException: Cannot invoke "Object.hashCode()" because "key" is null
	at java.util.concurrent.ConcurrentHashMap.get(ConcurrentHashMap.java:936)
	at com.lld.uber.repository.UberRepository.getRide(UberRepository.java:84)
	at com.lld.uber.service.UberService.simRace(UberService.java:356)
```
The MockMvc integration test showed the same failure as a raw `500` with a `jakarta.servlet.
ServletException` wrapper instead of the `404` + `ErrorResponse` body every other domain error in
this codebase produces.

### 3. Root Cause
`java.util.concurrent.ConcurrentHashMap` — unlike `HashMap` — throws `NullPointerException` from
`get(null)` rather than returning `null`, because `ConcurrentHashMap` disallows null keys entirely
and treats a null argument as a programming error, not a valid "not found" query. `UberRepository`
is backed by a `ConcurrentHashMap<String, Ride>`. Before `simRequest` runs, the sim engine's
`simRideId` field is `null` (set in `simReset()`). Every downstream sim method called
`simRepository.getRide(simRideId)` unconditionally, which for a `null` id call site actually
executes `map.get(null)` — the NPE fires *inside* the repository call, before the calling method
ever reaches its own `if (ride == null)` guard. The guard was correct for the case "the id exists in
memory but maps to no ride"; it did not protect against "the id itself doesn't exist yet."

### 4. Diagnostic Commands
```bash
# Reproduce directly against the service, no HTTP layer needed:
mvn -o test -Dtest='com.lld.uber.UberSimEngineTest#actingBeforeRequestThrowsDomainException'
# -> AssertionFailedError: expected RideNotFoundException but was NullPointerException

# Confirm ConcurrentHashMap's null-key behavior in isolation (not this repo's bug, but the
# standard-library contract that made the existing null-check pattern insufficient here):
jshell -q <<'EOF'
var m = new java.util.concurrent.ConcurrentHashMap<String, String>();
System.out.println(m.get(null));
EOF
# -> throws NullPointerException, confirming get(null) never returns null, it throws
```

### 5. Step-by-Step Resolution
1. Wrote `UberSimEngineTest` and `UberControllerIntegrationTest` to cover the sim engine's happy
   path and its "acted out of order" path, per this repo's standing rule that a new module (or in
   this case a new endpoint family) ships with real test coverage of its error paths, not just its
   success paths.
2. `mvn test` surfaced the NPE immediately — the tests did their job before any PR was opened.
3. Root-caused to `ConcurrentHashMap.get(null)`'s throw-not-return-null contract, traced through
   `UberRepository.getRide` → four sim methods that all shared the same unguarded call shape.
4. Added a single `requireSimRide()` helper in `UberService` that checks `simRideId != null` *before*
   calling into the repository, then checks the returned `Ride` for null, throwing
   `RideNotFoundException` from either branch — replacing four duplicated, individually-buggy
   inline checks with one correct one.
5. Re-ran the full `com.lld.uber.*Test` suite to confirm both tests now pass and nothing else
   regressed.

### 6. Preventative Measures
1. **A `ConcurrentHashMap`-backed repository's `get(id)` is not a safe method to call with a
   possibly-null id, ever — `get(null)` throws instead of returning `null`.** Any lookup keyed by a
   value that might not be set yet (a "current active X" id field, not a value from a validated
   path variable) must be null-checked *before* the map call, not after. `LldPage`/`Repository`
   `get*` methods across other modules take request-derived ids that Spring has already guaranteed
   non-null via `@PathVariable`; the sim engine's `simRideId` was different in kind — an
   internally-tracked "have we requested a ride yet" flag — and that difference is exactly what
   made the usual pattern unsafe here.
2. **Writing the "acted out of order" test case before opening the PR is what caught this** — it
   would have been a real, if minor, regression in the shipped module otherwise (a generic 500
   instead of the documented 404 contract every other domain error follows). New `/sim/*` endpoint
   families should get this same "call step N before step N-1" test as a standing checklist item,
   the same way `ErrorContractIntegrationTest`-style coverage is standing for controllers generally.
## RCA-052: Two Different Drivers Could Both Be Assigned the Same Ride — `DriverAssignmentService`'s Per-Driver Lock Never Covered the "Two Drivers, One Ride" Race, and the One Test That Exercised It Ran Only Once

### 1. Overview & Severity
**Severity: Medium (a real, live production race — caught by CI before merge, not by design).**
`DriverAssignmentService.assign()` serializes on a lock keyed by `driverId` alone. When two
*different* drivers try to accept the *same* ride at the same instant, they acquire two
*different* locks, so the check `if (ride.getDriverId() != null) throw ...` — the guard against a
ride being double-assigned — was never actually mutually exclusive across that scenario. This is a
live, reachable bug in `PUT /api/uber/rides/{id}/accept` and `/assign`, not something confined to
the new `/sim/*` engine built alongside this fix — it would have let two drivers both end up
`ON_TRIP` on the same ride in production, with the ride's `driverId` field non-deterministically
landing on whichever write happened to occur last.

### 2. Symptoms & Error Logs
`UberConcurrencyTest.oneRideManyDrivers_bindsToOneDriver` already raced 10 different drivers for
one ride — but ran only once per `mvn test` invocation, and usually passed anyway, because the
unguarded window (a read of `ride.getDriverId()` and a later write to it) is only nanoseconds wide.
A new test written for the `/sim/*` engine's own race step happened to loop the same scenario 25
times and caught it on CI (a differently-timed environment than the local machine) on the 25th
attempt:
```
[ERROR] UberSimEngineTest.raceAlwaysHasExactlyOneWinner:106 round 24 ==> expected: <true> but was: <false>
```
i.e. the "loser" driver's outcome was not a rejection — both drivers had been accepted.

### 3. Root Cause
```java
// DriverAssignmentService.assign(), before the fix
ReentrantLock lock = lockFor(driverId);   // keyed by driverId ONLY
lock.lock();
try {
    ...
    if (ride.getDriverId() != null) throw new DriverUnavailableException(...);  // check
    ride.setDriverId(current.getId());                                          // act
    ...
} finally { lock.unlock(); }
```
`lockFor(driverId)` returns a distinct `ReentrantLock` per driver id. Thread A (assigning
`driver-1`) and Thread B (assigning `driver-2`) to the *same* `Ride` object acquire two
independent locks and can both be inside their critical section at once. Both read
`ride.getDriverId() == null`, both pass the check, and both then write `ride.setDriverId(...)` —
a genuine unguarded write-write race on the shared `Ride`, on top of a torn read of the ride's
overall state (`driverName`, `vehicleNumber`, `status` fields end up mixed between the two
drivers' data depending on interleaving). The lock design correctly closed "one driver, two
riders" (both callers share the same driver lock in that case) but never considered "one ride, two
drivers" (both callers hold *different* locks in that case) as a distinct hazard needing its own
guard.

### 4. Diagnostic Commands
```bash
# Reproduce directly, deterministically, by repeating the race rather than running it once:
mvn -o test -Dtest='com.lld.uber.UberConcurrencyTest#repeatedTwoDriverRaceForOneRideNeverProducesTwoWinners'
# -> fails before the fix (usually within a few dozen of 300 rounds), passes after

# Confirm the single-shot version of the same scenario was already in the suite and already
# insufficient to catch this on its own:
mvn -o test -Dtest='com.lld.uber.UberConcurrencyTest#oneRideManyDrivers_bindsToOneDriver'
# -> passes most of the time even on the buggy code, by luck — not a reliable regression guard
```

### 5. Step-by-Step Resolution
1. Built the isolated `/api/uber/sim/*` engine's `simRace` step to demonstrate exactly the
   "two drivers, one ride" scenario as the module's headline concurrency example, and wrote
   `UberSimEngineTest.raceAlwaysHasExactlyOneWinner` to loop it 25 times (the same "a single run
   can pass by luck" reasoning `UberConcurrencyTest.repeatedRaceNeverProducesTwoWinners` already
   documents for the driver-lock scenario).
2. CI failed on round 24 — passed locally on the first few local runs, underscoring that this
   class of race needs repetition to surface reliably, and that a slower/differently-scheduled CI
   runner is exactly the kind of environment that will eventually hit it.
3. Traced the failure to `DriverAssignmentService.assign()`'s driver-only lock keying, confirmed
   by inspection that `oneRideManyDrivers_bindsToOneDriver` races the identical shape of scenario
   (many different drivers, one ride) but only once, and had therefore never caught this.
4. Added a second lock map keyed by ride id (`rideLockFor(rideId)`), acquired *before* the driver
   lock in a fixed order (ride lock, then driver lock), so the "is this ride already taken" check
   is now mutually exclusive regardless of which two drivers are contending for it, while the
   original per-driver guarantee (one driver cannot be double-booked across two rides) is
   preserved unchanged.
5. Added `UberConcurrencyTest.repeatedTwoDriverRaceForOneRideNeverProducesTwoWinners` (300 rounds,
   mirroring the existing repeated-race test's structure) as a permanent regression guard — a
   single-shot test for a nanosecond-wide race is not a reliable guard on its own.
6. Re-ran the full backend suite (`mvn test`, 1836 tests) and the isolated Uber suite multiple
   times to build confidence the fix holds under repetition, not just once.

### 6. Preventative Measures
1. **A lock keyed by one side of a two-party interaction only serializes contention on *that*
   side.** `DriverAssignmentService` needed to reason about two distinct hazards — "one driver,
   many riders" and "one ride, many drivers" — and a lock keyed by driver id alone only ever
   protected the first. Any assignment/matching service pairing two independently-identified
   entities (driver↔ride, seat↔passenger, table↔party) should ask explicitly which *pairs* of
   concurrent callers can collide, not just which callers share an id.
2. **A race-condition test that runs its contended scenario exactly once is not a regression
   guard — it is a coin flip that happens to have been landing the right way.** This repo already
   knew this for one scenario (`repeatedRaceNeverProducesTwoWinners`'s own comment says as much)
   but had not applied the same rule to every race-shaped test in the same file;
   `oneRideManyDrivers_bindsToOneDriver` is the proof — it exercised the exact buggy path for as
   long as this module has existed and never once reported it. Any new race test should default to
   a repeated-rounds form unless there's a specific reason a single run is sufficient.
3. **When two locks may be held at once, the ordering has to be a documented, fixed rule, not an
   afterthought.** The original javadoc actually predicted this ("If a future change needs both a
   driver and a ride lock, acquire driver-then-ride consistently") — but the eventual fix uses
   ride-then-driver instead (chosen to keep the whole "is this ride taken" check under one lock
   acquired before any driver-specific state is touched); the lesson is to update that comment
   the moment a second lock is actually introduced, not to trust a lock-ordering plan written
   before the second lock existed.
