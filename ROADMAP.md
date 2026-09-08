# Remaining Modules — Build Plan

Portfolio is at 59 modules (as of PRs #83–#85: Feature Flag, Notification System, Job
Scheduler; Locker Management, Payment Gateway, Web Crawler, Generic Cache Library,
Key-Value Store, Coupon/Promotion Engine and Blackjack/Deck of Cards shipped since —
see RCA-058, RCA-059 and RCA-060 for real bugs caught during those builds). This
document plans the remaining 1 module from the original gap-analysis session. It is
meant to be handed to a fresh agent as a self-contained brief — read `new-lld` skill
and one reference module (`splitwise`, `logging`, or `uber`) first regardless.

## Read first

- `.claude/skills/new-lld/SKILL.md` — the end-to-end checklist (backend layout, exception
  hierarchy, `/sim/*` engine, frontend, tests, docs). Follow it exactly; don't reinvent the
  package layout.
- `.claude/skills/lld-tests/SKILL.md` — especially the **repeated-round concurrency test**
  requirement. A single-shot 2-thread race reliably passes on broken code; every race test
  in this repo runs 100–300 rounds with a fresh service instance per round.
- One existing module close to what you're building, read start to finish:
  `backend/src/main/java/com/lld/uber/` (state machine + strategy + `/sim/*`) or
  `backend/src/main/java/com/lld/notification/` (idempotency lock + priority queue).

## Hard-won gotchas from the last batch (Feature Flag / Notification / Job Scheduler)

These cost real time last round — check for them before considering a module done:

1. **A `@Component`/`@Service` with two constructors and no true no-arg constructor needs
   exactly one marked `@Autowired`.** Spring cannot guess between "the production
   constructor" and "the test/sim constructor," and fails with a *misleading* error —
   `NoSuchMethodException: <init>()` / "No default constructor found" — even though a
   constructor obviously exists. This silently fails every `@SpringBootTest` in the module.
   Symptom: `ApplicationContext failure threshold (1) exceeded` repeated across unrelated
   test methods. See RCA-054.
2. **A check-then-act lock that dedupes *which record* two racing callers agree on is not
   the same guarantee as deduping *which caller gets to act on it afterward*.** If a method
   both claims (idempotency lock) and acts (enqueues/dispatches) in one call, gate the "act"
   step on an explicit "did I just create this" flag — not on the record's mutable status,
   which a duplicate-resolution path shares with the original. See RCA-053.
3. **`mvn test -Dtest='com.lld.<key>.*'` does not match test classes directly in package
   `com.lld.<key>`** (only sub-packages) — use `com.lld.<key>.**` (double-star) instead, or
   surefire reports "No tests matching pattern" and looks like everything passed.
4. **`config/DomainExceptionContractTest.java` has a hardcoded `BASES` allowlist** of every
   module's base exception class name. Add yours (alphabetically) or the build fails with
   "these would return HTTP 500 with no message."
5. **`frontend/node_modules` won't exist in a fresh worktree** and installing it fresh is
   slow; if working in a worktree alongside the main checkout, symlink it instead:
   `ln -s <main-repo>/frontend/node_modules <worktree>/frontend/node_modules` (it's
   gitignored — a symlinked `node_modules` doesn't match git's `**/node_modules/` glob
   exactly since it isn't a real directory, so double-check `git status` never picks it up
   before committing).
6. **Shared files will conflict if modules are built in parallel**: `AGENTS.md`,
   `README.md` (both the table row *and* the numbered detail section — renumber whichever
   merges second), `frontend/src/App.jsx`, `frontend/src/pages/Home.jsx`,
   `frontend/src/data/classDiagrams.js`, `frontend/src/data/designDetails.js`,
   `frontend/src/__tests__/routing.test.js` (the `cards.length` count), and
   `backend/.../config/DomainExceptionContractTest.java`. This is expected — rebase onto
   `main` before opening/merging each PR, resolve additively, and bump the README's `###
   NN.` numbering and the routing test's card count to match how many modules are *actually*
   on `main` at merge time, not how many were on it when you branched.
7. **Run the *full* backend suite before opening a PR, not just the new package** — the
   shared `DomainExceptionContractTest` and `designDataCoverage.test.js` fail on things
   *outside* your new files (a missing barrel registration, a missing `BASES` entry).

## Build order

Same three tiers as originally scoped. Nothing in Tier 2/3 depends on another module in
this list, so they can be built in parallel worktrees — just expect the shared-file
conflicts above at merge time.

---

## Tier 3

### 1. Workflow/Approval Engine

**Key**: `workflow` · route `/workflow` · package `com.lld.workflow`

**Pitch**: A generic multi-step approval chain — e.g. an expense report routes through
Manager → Director → Finance, with amount-based auto-escalation and a single point where
"approve" and "an automatic timeout escalation" can race.

- **Domain**: `WorkflowInstance` (current step, status, history), `ApprovalStep` (approver
  role, decision), an ordered chain of steps resolved by amount thresholds (a $50 expense
  only needs Manager; a $5,000 one needs all three).
- **Patterns**: **Chain of Responsibility** (the approval chain itself — each handler either
  decides or passes to the next), **State machine**
  (`PENDING → IN_REVIEW → APPROVED/REJECTED/ESCALATED`), Strategy (escalation/timeout
  policy — mirrors Job Scheduler's `MisfirePolicy` shape: what happens when a step isn't
  acted on in time).
- **The concurrency bug**: a human approval and an automatic timeout-escalation racing on
  the same workflow step at the same instant — both must serialize on a per-workflow-instance
  lock, and whichever "wins" must leave the instance in a single, well-defined state (never
  both approved *and* escalated). This is structurally the same shape as Job Scheduler's
  cancel/dispatch race (RCA-052-style: per-entity lock, re-check state inside the lock,
  100–300 round repeated test) — a deliberate callback to that pattern, worth stating
  explicitly in the design write-up as "the same guarantee as `jobscheduler`'s cancel/dispatch
  race, applied to approve/escalate."
- **API**: `POST /api/workflow` (submit, amount) → resolves the required chain,
  `POST /api/workflow/{id}/approve` (step, approverId), `POST /api/workflow/{id}/reject`,
  `GET /api/workflow/{id}`, `/sim/*`: reset, submit a small workflow (single step), submit a
  large one (full chain), approve through each step, a live approve-vs-escalate race, final
  snapshot with full history.
- **Exceptions**: `WorkflowException`, `WorkflowNotFoundException` (404),
  `InvalidStepTransitionException` (400), `UnauthorizedApproverException` (403 — wrong role
  acting on a step).

---

## After each module ships

Per the `new-lld` skill: register the route (`App.jsx` + `Home.jsx`), the design/diagram
barrels, bump `routing.test.js`'s card count, add the `AGENTS.md` section, the `README.md`
row + detail section, and — if a real bug surfaces while building and testing it (there
almost always is one, per the gotchas above) — an `RCA.md` entry via the `rca` skill. Then
`ship`: full local suites green, branch, PR, merge only on green CI.
