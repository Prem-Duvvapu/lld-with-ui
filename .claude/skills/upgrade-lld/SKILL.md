---
name: upgrade-lld
description: Raise an existing LLD module to the 17-criteria reference bar set by splitwise, logging and uber — add missing patterns, exception hierarchy, sim engine, Lombok models, tests, design data and docs. Use when the user asks to improve, deepen, complete or "make it as good as uber/splitwise" for a module that already exists.
---

# Upgrade an existing module to the reference bar

Most modules in this repo are partially built. This skill closes the gap between what a module
is and what `splitwise`, `logging` and `uber` are.

## Start by measuring the gap

Run the `audit-lld` skill first, or do its checklist inline. Do not start editing until you know
which of the 17 criteria fail — the work is different for a frontend-only shell than for a
module that just lacks tests.

**Two common starting states — the "frontend-only shell" state no longer exists:** every one of
the 49 current modules has a real backend now (the 9 concurrency primitives and the other six
modules once listed here all graduated). Verify with `ls backend/src/main/java/com/lld/<key>/`
rather than assuming from this table.

| State | What is missing | Where to start |
|---|---|---|
| Backend exists, thin | Patterns, sim engine, exception hierarchy, tests | Backend depth, then the simulation tab |
| Complete but shallow | Tests, design data, docs | Tests and content |

## Rules that make an upgrade different from a rewrite

- **Never delete or weaken an existing test to make yours pass.** If an old test now fails, the
  behaviour change is either a bug you introduced or a deliberate change that needs the test
  updated *and* explained.
- **Preserve working UI.** Operational tabs that already call real endpoints keep working; you
  are adding depth, not restarting.
- **One commit per concern**, conventional style: `feat(chess): add castling and en passant`,
  `test(chess): add move-legality and concurrency suites`.
- Branch off main first: `git checkout -b feat/<key>-depth`. Never commit to main.

## The upgrade passes, in order

### 1. Backend structure
Split a monolithic service into `controller / service / model / repository / exception` plus a
package per pattern used. The controller must end up translating HTTP only.

### 2. Real patterns
Replace inlined `switch` blocks and duplicated conditionals with an actual Strategy + Factory,
State machine, Chain of Responsibility or Decorator — whichever the domain genuinely calls for.
A pattern that is claimed in `README.md` but absent from the code is a defect; that mismatch is
the single most common finding in this repo.

Two examples of what "real" means here:
- **State machine**: a declared transition table (`Map<Status, Set<Status>>`) with
  `canTransitionTo` / `isTerminal`, replacing ad-hoc source-state checks scattered across
  methods. See `uber/model/RideStatus`.
- **Strategy**: rates and rules move onto the enum or into strategy classes, resolved by a
  factory — replacing a `switch` that was inlined at two call sites and had already drifted.
  See `uber/strategy/FarePricingStrategy`.

### 3. Concurrency correctness
Hunt specifically for **check-then-act races** — the recurring bug class here:

```java
if (driver.isAvailable()) {        // read
    driver.setStatus(ON_TRIP);     // write, with no lock between
}
```

Fix by taking a per-entity `ReentrantLock` and **re-reading and re-checking inside the lock**.
Where more than one lock is held, acquire in a deterministic order (ascending id or enum
ordinal) and comment the ordering. Then prove it with a concurrency test (`lld-tests`).

### 4. Exception hierarchy
Migrate the module's base exception onto `com.lld.config.DomainException` and annotate every
concrete exception with `@ResponseStatus`. Several modules still extend `RuntimeException`
directly with a hand-rolled `errorCode` field — those need converting. Then delete the module's
redundant controller-level catch-alls; `GlobalExceptionHandler` now covers them.

### 5. Lombok models
Convert hand-written getters/setters to `@Data @Builder @NoArgsConstructor @AllArgsConstructor`.

**Gotcha:** a single hard javac error aborts Lombok annotation processing and produces a flood
of spurious "cannot find symbol" errors on generated accessors in unrelated files. Fix the first
real error; the rest vanish. Do not chase them individually.

### 6. Sim engine, simulation tab, design data, tests, docs
Use the `simulation`, `design-details`, `class-diagram`, `lld-tests` and `rca` skills.

## Verify and report

```bash
cd backend && mvn test && cd ../frontend && npx vitest run && npm run build
```

Both suites green, entry chunk under 500 kB. Then `ship`. Report a per-criterion checklist and
**name explicitly what you did not do** — an incomplete upgrade honestly reported is fine; a
complete-sounding report that skipped tests is not.
