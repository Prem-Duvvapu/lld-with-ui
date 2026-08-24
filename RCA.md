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
| [RCA-007](#rca-007-a-one-time-bonus-strategy-re-firing-on-every-subsequent-vote) | 2026-08-24 | Backend / Stack Overflow / Reputation | A `ReputationStrategy` implementation modeled a one-time event as a per-vote calculation, so every vote on an already-accepted answer re-applied the accepted-answer bonus | Resolved |

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

## RCA-007: A One-Time Bonus Strategy Re-Firing on Every Subsequent Vote

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
