# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the other half of this context and is **authoritative for per-module behaviour** —
what each of the 60 modules seeds, which service methods exist, which patterns it demonstrates.
Read the relevant module section there before changing a module. This file covers the commands and
the cross-cutting structure that no single module file reveals.

For the current UI/UX completion scope and the next-agent prompt, read
`COMPLETION_HANDOFF.md`. The historical `ROADMAP.md` covers completed module creation.

## Commands

Run everything through WSL (`wsl <command>`) — the repo lives on a Windows drive.

```bash
# Backend (Java 17 / Maven, run from backend/)
mvn test                                  # latest validated: 2622 tests, 296 classes
mvn test -Dtest=SplitwiseServiceTest      # one class
mvn test -Dtest='SplitwiseServiceTest#someTestMethod'            # one method
mvn test -Dtest='com.lld.config.*Test'    # one package's suites
mvn package                               # -> target/lld-all-0.0.1-SNAPSHOT.jar
mvn -o -q compile                         # fast syntax check, no tests

# Frontend (Node 20 / Vite, run from frontend/)
npx vitest run                            # latest validated: 778 tests, 50 files
npx vitest run src/__tests__/routing.test.js          # one file
npx vitest run -t "<substring of test name>"           # one test by name
npm run build                             # entry chunk must stay under 500 kB (CI gates this)
```

**Never start the servers.** The user runs `mvn spring-boot:run` / `npm run dev` (or `./start.sh`)
manually and controls their lifecycle. Building, packaging and testing are fine; starting a process
that binds port 59190 or 53000 is not.

Backend on 59190, frontend on 53000 — both overridable via `BACKEND_PORT` / `FRONTEND_PORT`
env vars (application.properties, vite.config.js, docker-compose.yml, and start.sh all read
them; defaults live in the IANA dynamic/private range so they don't collide with common dev
ports). Swagger at `http://localhost:59190/swagger-ui.html`.

## Architecture

**One Spring Boot JAR, one React SPA, no database.** All state is in-memory (`ConcurrentHashMap`
+ `ReentrantLock`) and resets on restart — that is deliberate, since the point of the repo is to
demonstrate design and concurrency, not persistence.

**The backend owns all business logic; the frontend is a thin API shell.** A page must not
reimplement a rule (fare calculation, state transitions, lock ordering) that a service already
enforces — if the UI needs a decision, it calls an endpoint.

### Backend layout

`backend/src/main/java/com/lld/{module}/` with `controller / service / model / repository /
strategy / exception / config` sub-packages. `LldApplication` boots all 52 module packages at once
(`concurrency` nests nine primitive sub-packages of its own: `blockingqueue`, `bloomfilter`,
`concurrenthashmap`, `fizzbuzz`, `foobar`, `h2o`, `mergesort`, `ttlcache`, `zeroevenodd` — 51
standalone modules + those 9 concurrency primitives = the 60 LLD problems the frontend exposes as
individual pages).
Each module typically has a `{Module}Initializer` (`@PostConstruct` seed data) and a facade
`{Module}Service` that the controller delegates to wholesale.

`com.lld.config` is the shared layer every module depends on:

| Class | Role |
|---|---|
| `DomainException` | Abstract base — **a class, not an interface**, because `@ExceptionHandler` needs `Class<? extends Throwable>`. Each module's base exception `extends` it. |
| `ErrorResponse` | The response record: `error`, `code`, `status`, `timestamp`. |
| `GlobalExceptionHandler` | `@RestControllerAdvice`. Deliberately narrow — handles `DomainException`, `IllegalArgumentException`/`IllegalStateException`, `NoSuchElementException`. **Do not add a broad `RuntimeException` handler**; it would swallow Spring's own request-parsing exceptions. |

Concrete exceptions carry `@ResponseStatus(...)`; the handler reads it via `AnnotationUtils`.
Never hand-build an error body with `Map.of("error", e.getMessage())` — `Map.of` rejects nulls and
`getMessage()` is null for NPEs.

Modules with an interactive UI simulation expose an **isolated `/sim/*` endpoint set** backed by a
separate sandbox instance, so the demo cannot corrupt the real one.

### Frontend layout

`frontend/src/lld/{module}/` — one folder per module, containing `{Name}Page.jsx` and `api.js`
(thin wrappers over `utils/api.js`'s `apiFetch`, which normalises errors into `ApiError`).

`App.jsx` globs `./lld/**/*Page.jsx` **without `eager`** and wraps each in `React.lazy`. Eagerness
here is a real regression, not a style choice: it once put all 45 pages in a 1,474 kB entry chunk.
CI fails the build if the entry chunk exceeds 500 kB.

`LldPage` is the shared shell. It renders the `design` and `diagram` tabs **itself** and suppresses
`children` for them — a page that also renders `<ClassDiagram>` for those tabs is writing dead code.
Design components take a `module` prop (not `lldKey`, not `moduleKey`). Its function-children render
prop is called as `children(tab, setTab)` — the second argument (added alongside the RCA-055 fix so
`shoppingcart`'s checkout could still jump to the Orders tab after migrating off its own local
`activeTab` state) is optional and every pre-existing caller ignores it; reach for it only when a
page genuinely needs to switch tabs programmatically.

KV Store/CAS keeps draft/result ownership above this shell and attaches a request
scope only while a live tab is visible. Preserve last good reads; only a typed
`KeyNotFoundException`/404 is a miss. Prevent duplicate writes synchronously, ignore
late results and keep unknown outcomes explicit. A fresh read plus a user decision
permits another write; it does not prove cancellation or rollback of the old one
(RCA-109). The KV simulation subsequently shipped in #174: a separate Java sandbox
coordinator owns operation/event boundaries, joins real workers before reset and
returns detached snapshots (RCA-111). Browser playback uses seven acknowledged
steps, not fabricated thread scheduling. See `COMPLETION_HANDOFF.md` for final
review evidence and the separate hosted-deployment verification limit.

KV HTTP value fields are actual strings, numeric fields are whole JSON integers,
and omitted/null TTL means no expiry. Keep checked TTL multiplication and expiry
addition; rejected inputs cannot append commands or change state. The typed
`InvalidKvRequestException` is HTTP 400. CAS experiments accept 1–32 workers
(default eight), validated before seeding or allocating the pool (RCA-110).

### Learning curriculum

Phase 0 evidence is in `LLD_CURRICULUM_COVERAGE.md`: all 69 topics have explicit
outcomes, recommended prerequisites, implementation evidence or a no-mapping
decision, exercises and delivery gaps. Keep its graph aligned with the canonical
manifest; an audit row is not a published lesson. The coverage test also guards
the corrected ATM/KV teaching contracts and shrinkable shared pattern-card grid.

`/learn` and `/learn/:lessonId` are lazy routes backed by the canonical publication
manifest in `src/learning/curriculum.js`. Classes and Objects, Constructors, Access
Modifiers, Enums, Interfaces, Encapsulation, Abstraction, Inheritance, Polymorphism
and Association are published; 59 topics remain planned. Planned
topics must not be presented as delivered content. Lesson data stays separate from
module design data. Its displayed `.java` files live under `src/learning/examples/`
and are compiled by `ClassesAndObjectsExampleTest`, `OopExamplesTest` and
`StateBoundariesExampleTest`, including output
and visual-state contracts. Frontend deployment does not need backend source files.

`useLessonProgress` owns the separate `lld-lessons-v1` key. Resume writes must read
the current storage before merging, and notes are bounded at 2000 characters. Do not
mix lesson and module-reviewed state or call review marks mastery. `PageErrorBoundary`
handles failed route imports/rendering; lesson-content failures explicitly reload the
document because a same-document retry was ineffective in production Chromium.

### Design-data content

Every module's prose lives in **one file per module**: `src/data/design/{module}.js` and
`src/data/diagrams/{module}.js`, re-exported through the `designDetails.js` / `classDiagrams.js`
barrels. This split exists because both used to be single giant object literals, and JavaScript
silently discarded duplicate keys at parse time — 653 lines of content vanished before any lookup
ran (RCA-002). **Never add a second key for the same module.**

`src/data/moduleKeys.js` (`resolveModuleData`, `ALIAS_MAP`) is the *only* id→data resolver. New
spellings go in `ALIAS_MAP`, never into a component — the duplicated resolvers are how the two
components drifted apart in the first place.

**Class diagrams (`src/data/diagrams/{module}.js`) show the domain design only** — no exception
classes (no `XxxException` entries, no `throws`/`extends DomainException` relationships) and no
simulation plumbing (no `SimEvent`/`{Module}SimService` classes, no `sim*`-prefixed fields or
methods, no `/sim/*` labels on relationships). The simulation tab exists purely so a user can watch
the flow/sequence play out; it is not part of the class design and clutters the diagram if shown
there (issues #47, #48). This does not apply to `src/data/sequences/{module}.js` — a sequence
diagram walking a `/sim/*` request is fine, since sequence diagrams are about flow, not structure.

### Module maturity is uneven

All 60 modules now have backends — the last three concurrency primitives (`bloom-filter`,
`concurrent-hashmap`, `merge-sort`) graduated from frontend-only fake animations to real Java
backends with genuine threads, and five more modules (`threadpool`, `featureflag`, `notification`,
`jobscheduler`, `workflow`) have since been added at the same bar; `designDataCoverage.test.js`'s
`PENDING_DESIGN_CONTENT` allowlist is empty. **splitwise**, **logging** and **uber** are the
reference implementations — match their depth (layered packages, real patterns, typed exceptions,
concurrency tests, `/sim/*` engine) when building out a module.

`designDataCoverage.test.js` holds a `PENDING_DESIGN_CONTENT` allowlist of modules still lacking
full design data. Filling one in means removing it from that list.

## Guard-rail suites

These fail the build when a new module is half-wired, so read the failure rather than working
around it:

- `config/DomainExceptionContractTest` — every concrete `DomainException` declares
  `@ResponseStatus`, and none maps to 5xx.
- `config/GlobalExceptionHandlerTest` — all 54 exception→status mappings, explicitly.
- `config/ErrorContractIntegrationTest` — real MockMvc requests, proving the advice is registered
  and framework routing is untouched.
- `__tests__/designDataCoverage.test.js` — every id any page requests resolves; no duplicate barrel
  keys; no diagram edge pointing at an undeclared class.
- `__tests__/routing.test.js` — every home card links to a real route, every route has a file,
  every page file is routed, catch-all exists.
- `__tests__/accessibilityContracts.test.js` — every routed page renders through `LldPage`, every
  conditional banner/error (`{error && <div…>}` or `if (error) return <div…>`) is a
  `role="alert"`/`role="status"` region, and status tokens stay ≥ 4.5:1 on their tints.
- `__tests__/statusSurfaces.test.js` — filled status/accent palettes, hover effects and shared
  role pairing. Text/link colors and text-free indicators keep their separate theme roles.
- `__tests__/revealFocus.test.jsx` — reveal/hide preserves a stable keyboard focus location and
  design sections expose their selected state without changing attempt/reveal storage.

## Skills

Project skills live in `.claude/skills/<name>/SKILL.md` and are invocable with `/<name>`.
They encode the conventions below as executable procedure — prefer invoking one over
re-deriving the steps.

| Skill | Use it for |
|---|---|
| `/new-lld` | Add a brand-new LLD problem end to end — backend, page, data, tests, docs |
| `/upgrade-lld` | Raise an existing module to the 17-criteria reference bar |
| `/audit-lld` | Read-only gap analysis of a module (or all of them) against those criteria |
| `/simulation` | Create or improve the 8-step interactive 2D simulation tab and its `/sim/*` engine |
| `/class-diagram` | Create or improve `data/diagrams/<module>.js` |
| `/design-details` | Create or improve `data/design/<module>.js` |
| `/lld-tests` | Write the four test flavours — service, strategy, repository, concurrency |
| `/rca` | Add a structured six-section incident entry to `RCA.md` |
| `/ship` | Run suites, branch, commit, push, open the PR |

Typical chains: `/audit-lld` → `/upgrade-lld` → `/ship` for improving a module;
`/new-lld` → `/simulation` → `/lld-tests` → `/ship` for adding one.

## Workflow rules

**Never commit to `main`.** Branch off main (`<type>/<short-slug>`), conventional-commit messages,
push, open a PR (`gh pr create --base main --fill`), merge only when CI is green. Required checks
are `Backend — mvn test` and `Frontend — vitest + build` (names must match `ci.yml` exactly).
Run both suites locally first so CI confirms rather than discovers.

**After resolving any non-trivial issue** (concurrency race, build failure, port collision,
serialization bug, environment discrepancy), add a structured entry to `RCA.md` with all six
sections: Overview & Severity, Symptoms & Error Logs, Root Cause, Diagnostic Commands,
Step-by-Step Resolution, Preventative Measures.

## Known troubleshooting

A single hard javac error aborts Lombok's annotation processing, producing a flood of spurious
"cannot find symbol" errors on generated getters/setters in unrelated files. Fix the first real
error and the rest disappear — don't chase them individually.
