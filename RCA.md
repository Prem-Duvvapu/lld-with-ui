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
| [RCA-008](#rca-008-fresh-git-worktrees-start-with-zero-installed-frontend-packages) | 2026-08-24 | Frontend / Environment / Git Worktrees | A fresh `git worktree` had no `frontend/node_modules`, so `vitest`/`vite build` failed with a misleading `ERR_MODULE_NOT_FOUND` that looked like a broken `vite.config.js` rather than a missing install | Resolved |

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

---

## RCA-008: Fresh Git Worktrees Start With Zero Installed Frontend Packages

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
