# Project Audit — 2026-09-14

A cross-cutting, system-level audit of the whole repository, reviewed from seven perspectives:
backend engineering, frontend engineering, architecture, UI/UX, product, QA, and the person this
project actually exists for — a candidate preparing for LLD interviews.

**This is not a re-run of [`AUDIT.md`](AUDIT.md).** That document scores each of the 60 modules
against the 17-criteria reference bar (a *per-module depth* check). This one looks at everything
that lives *between* the modules — the build, the shared components, the deployment, the test
strategy, the product — which no per-module pass can see. Both are read-only analyses; nothing in
this document has been fixed by writing it.

Every claim below is backed by a command that was run against this tree at commit `2649aa8`.
Counts are reproducible; opinions are labelled as such.

---

## Scorecard

| Dimension | Grade | One-line verdict |
|---|:---:|---|
| Backend engineering | **A−** | Genuinely strong concurrency work; input validation is declared but unused |
| Architecture | **B+** | Clean, consistent module shape; duplicated registries and doc sprawl are the debt |
| Frontend engineering | **C+** | Works well, but ships 317 kB gzip of other modules' data on every page view |
| UI/UX | **B−** | Good interaction design; 1,092 hex literals mean dark mode is still a coin flip |
| QA | **C** | Backend testing is excellent; frontend has effectively no behavioural tests and no linter |
| Product | **B−** | Great substance, but a cold-start backend and zero social preview undercut the demo |
| LLD-candidate value | **A−** | Best-in-class reference material; thin on *active recall* mechanics |

**Overall: B.** This is a serious, unusually deep portfolio project whose weakest links are not in
the domain code — they're in the delivery path around it.

---

## The five findings that matter most

1. **Every module page downloads all 60 modules' design content** — a 1,142 kB chunk (317 kB
   gzipped), 41% of the entire build output. The CI size gate doesn't see it.
2. **A cold Render backend makes the live demo look broken**, because the HTTP client has no
   timeout and pollers fire every 1–2 s without waiting for the previous request.
3. **`spring-boot-starter-validation` is a dependency with one `@Valid` in the codebase** — all 60
   controllers accept unvalidated request bodies.
4. **The frontend has 33 hand-written tests and no linter** across 67,752 lines of JavaScript.
5. **The deployed app has one global shared world** — 311 Spring singletons, zero request/session
   scoping, so any visitor's actions are visible to every other visitor.

---

## 1. Senior Backend Engineer

### What's genuinely good

The concurrency work is the strongest part of this repository and it isn't close. 87 files use
`ReentrantLock` deliberately, lock-ordering is commented where two locks are held, and the race
tests are *real* — repeated-round tests (100–300 rounds, fresh service per round) rather than the
single-shot two-thread tests that pass on broken code. 2,282 tests across 276 test classes, all
green. The `com.lld.config` error contract (`DomainException` → `@ResponseStatus` →
`ErrorResponse`) is enforced by three guard-rail suites that actually fail the build. This is
better than a lot of production code.

### Findings

**B1 — Validation is declared but not used. (High)**
`spring-boot-starter-validation` is in `pom.xml`, but across 1,436 Java files there is exactly
**1** `@Valid` annotation and **3** `jakarta.validation` imports. All 60 controllers bind request
bodies with no constraint checking, so malformed input reaches service logic and surfaces as
whatever exception happens to be thrown first — `NullPointerException` included, which the global
handler deliberately does not catch.
*Recommendation:* add `@Valid` + a handful of `@NotNull`/`@Positive`/`@Size` constraints on
request DTOs, and a `MethodArgumentNotValidException` handler mapping to the existing
`ErrorResponse` shape. Highest value per line of code in the backlog.

**B2 — Two competing concurrency idioms. (Medium)**
87 files use `ReentrantLock`; 63 use `synchronized`. For the concurrency *primitives*
(`blockingqueue`, `foobar`, `h2o`) `synchronized`/`wait`/`notify` is pedagogically correct and
should stay. Elsewhere it's drift from the documented house style.
*Recommendation:* classify each `synchronized` usage as "intentional teaching example" or "drift",
and convert the latter. A comment on the intentional ones prevents the next reviewer re-asking.

**B3 — CORS is configured twice. (Low, but a real footgun)**
All 60 controllers carry `@CrossOrigin(origins = "*")` *and* `CorsConfig` registers global
mappings. Two sources of truth for the same policy; tightening origins later means editing 61
places and missing one.
*Recommendation:* delete the per-controller annotations, keep `CorsConfig` as the single point.

**B4 — Dependencies are ~2 years behind. (Medium — it's publicly deployed)**
Spring Boot **3.2.0** (Nov 2023) and springdoc **2.3.0**. The 3.2.x line left OSS support in Nov
2024, so this deployment no longer receives free security patches.
*Recommendation:* bump to the current 3.x line. With 2,282 tests as a safety net this is a
low-risk afternoon, and "kept current" is itself a signal to anyone reviewing the repo.

**B5 — Seven service classes exceed 500 lines.** `LinkedInService` (633), `ElevatorControllerService`
(589), `NotificationService` (583), `ZomatoService` (570), `UberService` (521), `AuctionService`
(511), `LibraryService` (505). Not alarming for facade services, but these are the files where the
next lock-ordering bug will hide. *(Observation, not a defect.)*

---

## 2. Senior Frontend Engineer

### Findings

**F1 — The 317 kB tax on every module page. (Critical)**
`LldPage.jsx` statically imports `DesignDetails`, `ClassDiagram` and `SequenceDiagram`. Those three
import barrel files that statically import **176 per-module data files** — 1.75 MB of raw source
(904 KB `design/`, 452 KB `diagrams/`, 396 KB `sequences/`). Rollup collapses it into one shared
chunk (built as `GithubSourceLinks-*.js`, named after an unrelated small component) of
**1,142 kB / 317 kB gzipped — 41% of the 2.8 MB dist.**

Opening *one* module downloads the design notes, class diagrams and sequence diagrams for *all
sixty*. The CI budget check only measures `dist/assets/index-*.js`, so this has never failed a
build.

*Recommendation:* convert the three barrels to lazy per-module resolution
(`import.meta.glob` without `eager`, matching how `App.jsx` already loads pages) and extend the CI
gate to assert a ceiling on the **largest** chunk, not just the entry chunk. Expected saving:
~300 kB gzip per module page view, on a free-tier host, for users on mobile.

**F2 — No timeout, no backoff, overlapping polls. (High — this is the one users feel)**
`apiFetch` calls `fetch` with no default timeout or `AbortSignal`. `usePolling` cleans up
correctly on unmount (good) but drives requests with a bare `setInterval`, so it fires the next
request whether or not the previous one has returned, never backs off after repeated failures, and
keeps polling while the tab is hidden. Elevator polls at **1,000 ms**.

On Render's free tier the backend spins down after inactivity and takes ~50 s to wake. During that
window the UI issues ~50 stacked requests that all hang, and shows `⏳ Loading…` the entire time
with no indication anything is wrong.

*Recommendation:* (a) default timeout via `AbortSignal.timeout()` in `apiFetch`; (b) in
`usePolling`, schedule the next poll *after* the previous settles, with exponential backoff on
failure and a `document.visibilityState` pause; (c) a "waking the server, this takes ~50s on the
free tier" banner after the first timeout. (c) alone converts "the site is broken" into "the site
is honest".

**F3 — No linter or formatter at all. (High)**
No ESLint, Prettier, or Biome config anywhere; no `lint` script; CI runs tests and build only.
67,752 lines of JavaScript with zero automated style or correctness enforcement. This is how
unused variables, missing hook dependencies, and accidental `console.log`s ship.
*Recommendation:* ESLint with `react-hooks` and `react-refresh` plugins, wired into CI. The
`react-hooks/exhaustive-deps` rule alone would be worth it given how much of this app is polling
effects.

**F4 — Five parallel per-module registries. (Medium)**
A module must be registered in `App.jsx` (`LLD_ROUTES`), `Home.jsx` (`ALL_LLDS` **and**
`routeMap`), `data/moduleKeys.js` (`ALIAS_MAP`), `data/modulePatterns.js`, and
`data/moduleSourceLinks.js`. `routing.test.js` guards the first two against drift; the other three
can silently fall out of sync — which is exactly how a module ends up with no pattern tag or no
source link and nobody notices.
*Recommendation:* one `modules.js` manifest as the single source of truth, with the others derived
from it; failing that, extend `routing.test.js` to assert all five registries cover the same keys.

**F5 — Runtime CSS string injection across 41 pages. (Medium)**
41 module pages inject a `<style>{CSS}</style>` block at render time. The circuit-breaker bug —
where the block lived only in `SimulationTab`, leaving the default Services tab completely
unstyled on first visit — was a direct consequence, and it reached production. A sweep of all 41
pages found **no other live instance** (the concurrency pages render one shared component across
both tabs; `rate-limiter`, `notification`, `thread-pool`, `featureflag`, `car-rental`,
`course-registration`, `meeting-scheduler`, `music-streaming` and `restaurant` duplicate the block
into each tab; `traffic-signal`'s app tab is fully inline-styled). So the bug was a one-off — but
the *pattern that allowed it* is everywhere, and no test in the repo could catch a recurrence.
*Recommendation:* CSS modules or plain co-located `.css` imports, converted opportunistically.

**F6 — `ZomatoPage.jsx` is 1,787 lines.** Followed by Uber (1,158), Splitwise (1,139),
VendingMachine (1,071), LinkedIn (1,044). Single-file pages holding CSS, several tab components,
and API orchestration. *(Observation.)*

---

## 3. Senior Code Architect

### What's genuinely good

The backend module shape is *consistently* applied across 60 modules —
`controller/service/model/repository/strategy/exception`, a `{Module}Initializer` seeding demo
data, a facade `{Module}Service`. Someone who reads one module can read any module. The shared
`config` layer is small, well-reasoned, and defended by tests. The deliberate choice of in-memory
state over a database is correct for the project's purpose and is documented as such.

### Findings

**A1 — One global world for all visitors. (High for the deployed demo)**
311 Spring singletons hold mutable state; there is **no** `@SessionScope`, `@RequestScope`, or
`HttpSession` usage anywhere. Two people on the live site share one parking lot, one elevator
bank, one auction. The `/sim/*` sandbox pattern isolates demos from live state — but not visitors
from each other.

This is the right trade-off for a local learning tool and the wrong one for a public URL on a
résumé, where a recruiter may well land on state some earlier visitor left broken.
*Recommendation:* don't add sessions to 60 modules. Either (a) a periodic reset-to-seed job
(cheapest, ~20 lines, restores a sane demo every N minutes), or (b) a visible "Reset this module"
control — several modules already have one — promoted into `LldPage` so it's uniform.

**A2 — Documentation outweighs its own usefulness. (Medium)**
`RCA.md` is 6,023 lines / 425 KB across 68 entries. `AGENTS.md` is 2,059 lines / 240 KB.
`README.md` is 1,699 lines / 120 KB with 196 headings. That's ~800 KB of Markdown against 137 KLOC
of code. The RCA discipline is genuinely admirable and worth keeping — but a single 425 KB file is
no longer navigable, and a 120 KB README is not a README, it's a manual where the first screen
should be selling the project.
*Recommendation:* split `RCA.md` into `rca/` one file per entry with an index; cut `README.md` down
to a one-screen pitch (what, live link, screenshot, how to run) with the detail moved to `docs/`.

**A3 — Java version drift between environments. (Low)**
`pom.xml` targets Java 17 and CI provisions JDK 17; the dev container runs JDK 21. Same bytecode
target, so it's benign today — but it's the kind of gap that produces "works in CI, not locally".
*Recommendation:* a `.tool-versions`/`.sdkmanrc`, or simply move both to 21.

**A4 — Four git identities for one author.** `Prem Duvvapu` (80), `Prem-Duvvapu` (29), `Claude`
(22), `DUVVAPU PREM SAI GANESH BABU` (2). Cosmetic, but it's the contributor graph a reviewer sees.
*Recommendation:* a `.mailmap`.

---

## 4. Senior UI/UX Designer

### What's genuinely good

The interaction model is thoughtful and unusually complete for a side project: consistent tab
shell, live-polling operational views, 8-step simulations with telemetry HUDs, a reveal-gate that
turns a reference site into a practice tool, progress tracking, pattern filtering, and a guided
tour. Dark/light theming exists and is tokenised in `theme.css`. Keyboard shortcuts on the home
grid. These are product instincts, not just engineering ones.

### Findings

**U1 — 1,092 hardcoded hex colours in module pages. (High)**
Counted across `src/lld/**/*.jsx`. Every one is a place where the light/dark theme is decided at
authoring time instead of by the user's setting. `AUDIT.md` flagged the worst offenders per module
(coffeemachine 85, airline 72, chess 58, elevator 53 — the last now fixed); this is the
portfolio-wide total. The practical symptom is what prompted the elevator rework: badges and
surfaces that look fine in light mode and go muddy or illegible in dark.
*Recommendation:* batch conversion to `var(--*)` tokens, worst-first. A CI grep asserting no new
six-digit hex literals in `src/lld/` would stop the bleeding immediately, even before the backlog
is cleared.

**U2 — Accessibility is close to unmeasured. (Medium)**
Across 340 frontend files there are 18 `aria-*` attributes and 16 `role=` — nearly all of them on
the home grid and the shared tab shell, leaving the 60 module UIs essentially unannotated. There
are no `<img>` tags at all (icons are emoji), so alt text is moot — but that is itself the issue:
emoji carry real state in several modules (`✅`/`⛔`/`🟡` for circuit-breaker phase, car status in
elevator) and screen readers announce them inconsistently, with no adjacent text label. Colour is
similarly load-bearing — the elevator now ships a legend, most modules don't. No focus-visible
styling outside the home grid, no skip link, no automated a11y check anywhere.
*Recommendation:* add `eslint-plugin-jsx-a11y` (rides along with F3); pair every status emoji with
a text label or `aria-label`; one pass for focus states.

**U3 — Loading and error states are plain text. (Low–Medium)**
`⏳ Loading services…` / `⏳ Loading intersection state…` as bare centred text, with no skeletons
and — per F2 — no eventual failure state. On a cold backend the user stares at an hourglass
indefinitely.
*Recommendation:* skeleton placeholders sized to the real content, plus a timeout state with a
retry affordance. Pairs directly with F2.

**U4 — 12 font weights loaded render-blocking.** `index.html` pulls Inter at 300–800 (6 weights)
and Fira Code at 400–700 (4) from Google Fonts in a blocking `<link>`. Most are unused.
*Recommendation:* trim to the 2–3 weights actually used; `display=swap` is already set.

---

## 5. Senior Product Manager

### The product thesis is sound

60 interactive LLD problems, each with a real Java backend, a live UI, a class diagram, a sequence
diagram and a written design rationale, deployed free. There is nothing quite like it in the
"interview prep portfolio" space, and the concurrency demonstrations in particular are a genuine
differentiator — most LLD repos are static code dumps; this one *runs*.

### Findings

**P1 — The free-tier cold start is the product's biggest risk. (Critical)**
This is on a résumé. A recruiter clicks it once, at a random time, almost certainly when the Render
instance has spun down. They get a spinner (see F2) and leave. Everything else in this document is
secondary to that.
*Recommendation:* the honest-banner fix from F2, **plus** an uptime pinger (a free cron hitting
`/api/splitwise/users` every 10 minutes keeps the instance warm during waking hours). Cheap,
decisive.

**P2 — Zero social preview. (High, trivially fixed)**
`index.html` has the title "LLD with UI", no meta description, no Open Graph or Twitter card tags,
and there is no `public/` directory at all — no favicon, no `robots.txt`. Every share of this link
on LinkedIn, Slack or a DM renders as a bare grey box.
*Recommendation:* a real title ("Low Level Design — 60 interactive systems"), meta description, OG
image (a screenshot of the elevator or splitwise page would do), and a favicon. Under an hour,
disproportionate return on a link meant to be shared.

**P3 — No analytics and no error reporting. (Medium)**
There is no way to know whether anyone uses this, which modules they open, or what breaks for them.
The circuit-breaker styling bug was found by the author looking at the page — not by instrumentation.
*Recommendation:* a privacy-respecting counter (Plausible/Umami free tier) and a client error hook.
Knowing the top 5 modules would also tell you where to spend the `upgrade-lld` budget.

**P4 — The README buries the lede.** 1,699 lines before a visitor learns what this is. The live
link and a screenshot should be in the first ten. *(See A2.)*

---

## 6. Senior QA

### What's genuinely good

The backend test suite is the best thing in this repository: 2,282 tests / 276 classes, including
repeated-round concurrency tests that genuinely fail on broken code, plus four guard-rail suites
(`DomainExceptionContractTest`, `GlobalExceptionHandlerTest`, `ErrorContractIntegrationTest`,
`designDataCoverage`) that turn documented conventions into build failures. CI runs both suites on
every branch and PR, with a bundle-size budget.

### Findings

**Q1 — The frontend test suite tests data, not behaviour. (Critical)**
The headline "396 tests" is misleading: there are **33 hand-written `it()` declarations across 4
files**, and 381 of the 396 are generated by one parametrised loop in `designDataCoverage.test.js`.
What that leaves:

- **0** component render tests. **0** interaction tests. **0** hook tests.
- `useProgress`, `useReveal`, `useTour`, `useRevisit` and `utils/progressData.js` — all five of the
  features shipped this month — have **no tests at all**, including the localStorage migration path
  in `useProgress` that rewrites every user's stored format on first read.
- **2 of 60** `api.js` modules are tested (`parking`, `trafficSignal`).
- `routing.test.js` and `designDataCoverage.test.js` work by reading source files **as text** and
  regex-matching them. They're clever and they've caught real bugs — but they verify that code
  *looks* right, not that it *runs* right.

Every frontend bug this month (circuit-breaker unstyled tab, digital-wallet sim showing 2 of 3
wallets, elevator theming) was found by a human looking at the screen. No existing test could have
caught any of them.

*Recommendation, in order:* (1) React Testing Library + tests for the five untested
hooks/utils — cheap, pure logic, immediate value; (2) a smoke test that renders each of the 60
pages and asserts no crash (would have caught the unstyled-tab class of bug if paired with a
computed-style assertion); (3) Playwright is already installed in the dev environment — one E2E
covering home → module → reveal → simulate would cover the golden path.

**Q2 — No lint stage in CI.** *(See F3.)*

**Q3 — No coverage measurement on either side.** Neither `mvn test` nor `vitest` reports coverage;
there is no threshold. 2,282 backend tests is a great number that nobody can map to a percentage.
*Recommendation:* JaCoCo on the backend, `vitest --coverage` on the frontend, reported in CI. Don't
gate on a number yet — just make it visible.

**Q4 — The bundle-size gate measures the wrong chunk.** *(See F1.)* A budget that passes while 41%
of the build sits in an unmeasured chunk is a false sense of security.

---

## 7. The LLD Candidate (the user this is for)

Judged only on one question: *does using this make someone better at LLD interviews?*

### Where it clearly works

- **Reading a real, running implementation beats reading a gist.** Being able to trip a circuit
  breaker, watch it reopen after cooldown, then read the `State` implementation that did it is a
  materially better learning loop than a static UML picture.
- **The concurrency modules are interview gold.** Race conditions that are *demonstrated* — with a
  test that fails without the lock — are the single hardest thing to learn from a book, and the
  hardest thing to speak about credibly in an interview.
- **The design data is genuinely well-structured**: requirements, entities, patterns, SOLID,
  OOP concepts, extensibility, **trade-offs**, highlights. Trade-offs in particular are what
  interviewers actually probe, and most study material omits them.
- **The reveal-gate is the right instinct** — it converts passive reading into an attempt-first
  loop, which is where the learning actually happens.

### What's missing for interview readiness

**L1 — No active recall.** The reveal-gate makes you *pause*; it doesn't make you *produce*. There
is nowhere to write your own class list or API surface before revealing, and nothing to compare it
against afterwards. A free-text box, saved to localStorage, shown side-by-side with the real entity
list after reveal, would close the loop. *(This was scoped once as "compare my design" and never
built — it is, in my view, the highest-value remaining feature in the whole backlog.)*

**L2 — No interviewer follow-ups.** Every real LLD round is 20% "design it" and 80% "now what if…".
Each module should carry 3–5 stock follow-ups — *"how does this change at 10× write volume?"*,
*"where's the bottleneck?"*, *"make this multi-region"* — with a revealable answer. The content to
write them already exists in the `extensibility` and `tradeoffs` fields; it just isn't framed as a
question.

**L3 — No scale or complexity numbers.** No Big-O on the operations, no back-of-envelope sizing.
LLD rounds routinely drift into "what's the complexity of that lookup" and the site can't help.

**L4 — Recall isn't scheduled.** The revisit flag records *that* you want to come back; nothing
tells you *when*. A "due for review" sort on the home grid using the last-reviewed timestamp (which
is already stored) is a small change on top of what shipped this month.

**L5 — Progress is trapped in one browser.** Export/import exists, which is the right no-backend
answer — but it's manual. Worth knowing the limitation rather than fixing it; adding auth would
cost more than it returns.

---

## Prioritised backlog

**P0 — do these first**

| # | Item | Why | Est. |
|---|---|---|---|
| 1 | Cold-start banner + uptime pinger (F2, P1) | The demo currently looks broken to first-time visitors | 2h |
| 2 | Lazy-load design/diagram/sequence barrels (F1) | ~300 kB gzip saved on every module page | 4h |
| 3 | `AbortSignal` timeout + poll backoff (F2) | Stops request pile-up on a cold or slow backend | 3h |
| 4 | OG tags, meta description, favicon (P2) | Every shared link currently renders as a grey box | 1h |

**P1 — next**

| # | Item | Why | Est. |
|---|---|---|---|
| 5 | ESLint + `jsx-a11y` + `react-hooks`, wired into CI (F3, U2, Q2) | 67k lines with no automated enforcement | 3h |
| 6 | Tests for the 5 untested hooks/utils (Q1) | Pure logic, includes a live data migration | 4h |
| 7 | Request validation on controllers (B1) | A declared dependency doing nothing | 6h |
| 8 | Periodic reset-to-seed for the public demo (A1) | Stops one visitor breaking it for the next | 2h |
| 9 | CI gate on largest chunk, not entry chunk (Q4, F1) | The current budget measures the wrong thing | 1h |
| 10 | "Compare my design" attempt box (L1) | Highest learning-value feature remaining | 6h |

**P2 — worth doing, not urgent**

Hex-literal → token sweep (U1) · Spring Boot upgrade (B4) · split `RCA.md`, shrink `README.md`
(A2, P4) · single module manifest (F4) · interviewer follow-ups per module (L2) · analytics (P3) ·
coverage reporting (Q3) · CORS de-duplication (B3) · `.mailmap` (A4) · font-weight trim (U4).

---

## Appendix — measured facts

| Metric | Value |
|---|---|
| Backend Java files / LOC | 1,436 / 69,364 |
| Backend test classes / tests | 276 / 2,282 (all passing) |
| Frontend JS+JSX files / LOC | 340 / 67,752 |
| Frontend test files / hand-written `it()` / reported tests | 4 / 33 / 396 |
| Module pages | 60 |
| Spring singletons (`@Service`/`@Component`/`@Repository`) | 311 |
| Request/session-scoped beans | 0 |
| `ReentrantLock` files / `synchronized` files | 87 / 63 |
| `@Valid` usages | 1 |
| Controllers with `@CrossOrigin(origins = "*")` | 60 of 60 |
| Hex colour literals in `src/lld/**` | 1,092 |
| `aria-*` / `role=` attributes (`<img>` tags: 0, icons are emoji) | 18 / 16 |
| Pages injecting a runtime `<style>` block | 41 |
| Parallel per-module registries | 5 |
| Build output / chunk count | 2.8 MB / 67 |
| Largest chunk (loaded on every module page) | 1,142 kB (317 kB gzip), 41% of dist |
| Entry chunk (the only one CI measures) | 275 kB |
| Raw design + diagram + sequence data | 1.75 MB (904 + 452 + 396 KB) |
| Markdown documentation | ~800 KB (RCA 425, AGENTS 240, README 120) |
| RCA entries | 68 |
| Commits / contributor identities | 133 / 4 (one human, one assistant) |
| Spring Boot / springdoc / Java target | 3.2.0 / 2.3.0 / 17 |

### How to reproduce

```bash
# Scale
find backend/src/main/java -name "*.java" | wc -l
find frontend/src \( -name "*.jsx" -o -name "*.js" \) | wc -l

# Backend posture
grep -rn "@Valid" backend/src/main/java | wc -l
grep -rl "ReentrantLock" backend/src/main/java | wc -l
grep -rn "@SessionScope\|@RequestScope\|HttpSession" backend/src/main/java | wc -l

# Frontend posture
grep -rno "#[0-9a-fA-F]\{6\}\b" --include=*.jsx frontend/src/lld/ | wc -l
grep -rn "aria-" --include=*.jsx frontend/src | wc -l

# The bundle finding
cd frontend && npm run build && ls -S dist/assets/*.js | head -3
du -sh src/data/design src/data/diagrams src/data/sequences
```
