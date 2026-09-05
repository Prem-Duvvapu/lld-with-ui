---
name: audit-lld
description: Audit an LLD module against the 17-criteria reference bar and report a per-criterion checklist with evidence — no edits. Use when the user asks how good a module is, what is missing, what is left to do, or asks for a review/gap analysis of a module or of the whole portfolio.
---

# Audit a module against the 17-criteria bar

**Read-only.** Produce a checklist with evidence. Do not fix anything — the user decides what to
act on, then `upgrade-lld` does the work.

If the user names no module, audit all of them and return a summary table sorted worst-first.

## The 17 criteria

**Backend**
1. Layered packages (`controller / service / model / repository / exception`) plus a package per
   pattern actually used.
2. Facade service owns all logic; controller only translates HTTP.
3. At least one GoF pattern implemented end to end — real, not a class named after one.
4. Thread safety with intent: `ConcurrentHashMap` store, `ReentrantLock` for compound mutations,
   and a comment stating lock ordering wherever more than one lock is held.
5. An isolated `/api/<key>/sim/*` engine — reset, per-step actions, event log and snapshots,
   operating on state **separate** from live module state.
6. Typed enums instead of string literals.
7. Lombok models (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`).
8. Exception hierarchy on the shared contract: base `extends com.lld.config.DomainException`,
   every concrete exception carries `@ResponseStatus`, none maps to 5xx.
9. Tests in four flavours: service, strategy/unit, repository, concurrency.

**Frontend**
10. `<Name>Page.jsx` + `api.js` using the shared `apiFetch`.
11. 5–6 tabs: two or three operational, then Simulation, Class Diagram, Design Details.
12. An 8-step interactive 2D simulation driven by `/sim/*` with a live telemetry HUD.
13. Live polling of server state via `src/hooks/usePolling.js`.
14. A full `data/design/<key>.js`.
15. A `data/diagrams/<key>.js`.
16. Theme tokens only — no literal colours; both light and dark must work.

**Docs**
17. `AGENTS.md` module section, `README.md` table row + detail section, and an `RCA.md` entry for
    any non-trivial bug found.

## How to check each one honestly

Verify against the code, not the documentation. The single most common finding in this repo is a
pattern advertised in `README.md` that does not exist in the source.

```bash
# 1  structure
ls backend/src/main/java/com/lld/<key>/

# 2  controller doing logic — anything past a delegation line is a smell
grep -n "if \|for \|calculate\|new " backend/src/main/java/com/lld/<key>/controller/*.java

# 3  a "Strategy" with one implementation and no factory is not a Strategy
grep -rn "interface .*Strategy" backend/src/main/java/com/lld/<key>/ && \
  grep -rln "implements .*Strategy" backend/src/main/java/com/lld/<key>/

# 4  check-then-act races: a read and a write on the same entity with no lock between
grep -rn "isAvailable()\|getStatus() ==" backend/src/main/java/com/lld/<key>/service/

# 5  sim engine, and whether it is genuinely isolated
grep -rn "/sim/" backend/src/main/java/com/lld/<key>/controller/
grep -rn "sim[A-Z]\|simRepository\|simMachine" backend/src/main/java/com/lld/<key>/service/

# 6  string literals where an enum belongs
grep -rn 'equals("' backend/src/main/java/com/lld/<key>/

# 7  hand-written accessors
grep -rn "public .* get[A-Z]" backend/src/main/java/com/lld/<key>/model/

# 8  exception contract
grep -rn "extends" backend/src/main/java/com/lld/<key>/exception/ 2>/dev/null
grep -rLn "@ResponseStatus" backend/src/main/java/com/lld/<key>/exception/*.java 2>/dev/null

# 9  tests
find backend/src/test -path "*<key>*"

# 10-13  frontend
ls frontend/src/lld/<key>/
grep -n "fetch(" frontend/src/lld/<key>/api.js          # should be none — use apiFetch
grep -n "tabs=" frontend/src/lld/<key>/*Page.jsx
grep -n "usePolling" frontend/src/lld/<key>/*Page.jsx

# 14-15  data files
ls frontend/src/data/design/<key>.js frontend/src/data/diagrams/<key>.js 2>&1
grep -n "<key>" frontend/src/__tests__/designDataCoverage.test.js   # in PENDING_DESIGN_CONTENT?

# 16  hardcoded colours
grep -n "#[0-9a-fA-F]\{3,6\}" frontend/src/lld/<key>/*Page.jsx | head

# 17  docs
grep -n "<key>\|<Module>" AGENTS.md README.md | head
```

## Report format

A table: criterion, ✅/❌/⚠️, and one line of evidence — a file path, a line number, or the
grep result that proves it. An unevidenced ✅ is not an audit.

Close with the **three highest-value fixes**, ranked. Not all 17 gaps matter equally: a
check-then-act race outranks a missing Lombok annotation every time.

## Known baseline

All 49 modules now have real backends — the last frontend-only shells (the 9 concurrency
primitives, plus `car-rental`, `concert-ticket`, `course-registration`, `cricinfo`,
`music-streaming`, `restaurant`) graduated during earlier upgrade passes. Do not assume any module
still lacks a backend — verify with `ls backend/src/main/java/com/lld/<key>/` before reporting
criteria 1–9 as failing by definition; that used to be a safe shortcut and no longer is.

`splitwise`, `logging` and `uber` are the reference bar. If an audit finds one of them failing a
criterion, that is a real regression worth flagging loudly.

This baseline drifts every time a new module ships — re-derive the module count from
`find frontend/src/lld -maxdepth 2 -iname "*Page.jsx" | wc -l` rather than trusting a number
written here, the same way `ship`'s test-count baselines are self-flagged as approximate.
