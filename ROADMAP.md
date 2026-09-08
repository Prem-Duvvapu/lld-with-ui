# Remaining Modules — Build Plan

Portfolio is at 60 modules — every module originally scoped by the gap-analysis session
that produced this document has now shipped, including this document's last entry,
Workflow/Approval Engine (see RCA-058 through RCA-061 for real bugs caught while
building the last several modules). **Zero modules remain in this plan.** This file is
kept as a historical record of how that final batch was scoped and built; a future
gap-analysis session should start a fresh document rather than append to this one.

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

## Hard-won gotchas from the last batch (Feature Flag / Notification / Job Scheduler / Workflow)

These cost real time in past rounds — check for them before considering a module done:

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
3. **A method that races two different actions against the same mutable state must
   re-validate its OWN identity/target, not just the state's status, inside the lock.**
   Workflow's `triggerEscalation` originally re-checked only "is the instance still
   pending?" — but once an approval advanced routing to a new step, a stale escalation
   armed against the OLD step would silently succeed against the NEW one instead of being
   rejected, because nothing tied the escalation to the specific step it was meant for. The
   fix: pass the target step index explicitly and re-validate it's still current, inside
   the same lock acquisition. See RCA-061.
4. **`mvn test -Dtest='com.lld.<key>.*'` does not match test classes directly in package
   `com.lld.<key>`** (only sub-packages) — use `com.lld.<key>.**` (double-star) instead, or
   surefire reports "No tests matching pattern" and looks like everything passed.
5. **`config/DomainExceptionContractTest.java` has a hardcoded `BASES` allowlist** of every
   module's base exception class name — *unless* the module's base exception class is
   declared `abstract`, in which case reflection-based scanning finds it automatically and
   no allowlist entry is needed (the pattern every module since Coupon/Blackjack/Workflow
   has used).
6. **`frontend/node_modules` won't exist in a fresh worktree** and installing it fresh is
   slow; if working in a worktree alongside the main checkout, symlink it instead:
   `ln -s <main-repo>/frontend/node_modules <worktree>/frontend/node_modules` (it's
   gitignored — a symlinked `node_modules` doesn't match git's `**/node_modules/` glob
   exactly since it isn't a real directory, so double-check `git status` never picks it up
   before committing).
7. **Shared files will conflict if modules are built in parallel**: `AGENTS.md`,
   `README.md` (both the table row *and* the numbered detail section — renumber whichever
   merges second), `frontend/src/App.jsx`, `frontend/src/pages/Home.jsx`,
   `frontend/src/data/classDiagrams.js`, `frontend/src/data/designDetails.js`,
   `frontend/src/data/sequenceDiagrams.js`,
   `frontend/src/__tests__/routing.test.js` (the `cards.length` count), and
   `backend/.../config/DomainExceptionContractTest.java` (only if the new module's base
   exception isn't `abstract`). This is expected — rebase onto `main` before
   opening/merging each PR, resolve additively, and bump the README's `### NN.` numbering
   and the routing test's card count to match how many modules are *actually* on `main` at
   merge time, not how many were on it when you branched.
8. **Run the *full* backend suite before opening a PR, not just the new package** — the
   shared `DomainExceptionContractTest` and `designDataCoverage.test.js` fail on things
   *outside* your new files (a missing barrel registration, a missing `BASES` entry).

## Shipped in this batch

Locker Management, Payment Gateway, Web Crawler, Generic Cache Library, Key-Value Store,
Coupon/Promotion Engine, Blackjack/Deck of Cards, and Workflow/Approval Engine — all
built end to end (backend + `/sim/*` engine + frontend + design data + class/sequence
diagrams + four test flavours each) and shipped via the `new-lld` → `ship` cycle. See
each module's `AGENTS.md` section and `README.md` detail section for what it demonstrates.

---

## After each module ships

Per the `new-lld` skill: register the route (`App.jsx` + `Home.jsx`), the design/diagram
barrels, bump `routing.test.js`'s card count, add the `AGENTS.md` section, the `README.md`
row + detail section, and — if a real bug surfaces while building and testing it (there
almost always is one, per the gotchas above) — an `RCA.md` entry via the `rca` skill. Then
`ship`: full local suites green, branch, PR, merge only on green CI.
