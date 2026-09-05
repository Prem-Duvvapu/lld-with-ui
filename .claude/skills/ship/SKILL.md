---
name: ship
description: Run both test suites and the build, commit on a branch, push and open a PR against main following the required git workflow. Use when the user asks to commit, push, raise a PR, or ship/land a change.
---

# Ship a change

The repo rule is absolute: **nothing goes to `main` directly.** Every change — feature, fix, doc
edit — goes through a branch, a PR, and green CI.

## 1. Verify locally first

CI should confirm, not discover. Run everything before pushing:

```bash
cd backend  && mvn test        # baseline: 1836 tests, 208 classes
cd frontend && npx vitest run  # baseline: 328 tests, 3 files
cd frontend && npm run build   # entry chunk must stay under 500 kB
```

All three must pass. **Report the real numbers.** If a suite fails, say so with the output and
stop — do not push and hope.

Note: the baselines above drift every time a module or test is added — they were last confirmed
correct on 2026-09-05. Compare against what the suites actually print, not against these numbers;
treat any "baseline" comment anywhere in this repo the same way.

## 2. Branch

```bash
git status                     # confirm what you are about to commit
git checkout main && git pull
git checkout -b <type>/<short-slug>
```

`<type>` is `feat`, `fix`, `test`, `docs`, `chore`, `ci`. One branch per logical unit of work.
If already on a feature branch with the work committed, skip to step 4.

**Check whether local `main` is ahead of `origin/main`** (`git log origin/main..main`) — if it
is, unpushed commits will pollute the PR diff. Raise it with the user rather than silently
pushing main.

## 3. Commit

Conventional commits, one per module or per concern:

```
feat(uber): add pricing strategy, ride state machine and race-free driver assignment
test(chess): add move-legality and concurrency suites
fix(atm): declare BankingService in the class diagram so the edge renders
```

Body: what changed and **why**. If the work is incomplete, say which part in the commit body —
an honest "the sim engine and tests are still to come" is worth more than a clean-sounding
message that misleads the next reader.

End every commit message with the `Co-Authored-By:` (and, if given, `Claude-Session:`) line your
current session's attribution instructions specify — the exact model name changes over time and
across sessions, so do not hardcode one here; use whatever this session has been told to use.

## 4. Push and open the PR

```bash
git push -u origin <branch>
gh pr create --base main --fill
```

End the PR body with:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**If `gh` is not installed** (verify with `which gh` — as of 2026-09-05 it is installed on this
machine, but do not assume that holds forever) — do not fail silently. Push the branch and give
the user the compare URL to click:
`https://github.com/<owner>/<repo>/compare/main...<branch>?expand=1`

## 5. CI must be green before merge

`.github/workflows/ci.yml` runs on every push and PR:

| Job | Steps |
|---|---|
| `Backend — mvn test` | `mvn test`, `mvn package -DskipTests`, uploads surefire reports on failure |
| `Frontend — vitest + build` | `npm ci`, `npx vitest run`, `npm run build`, entry-chunk size gate |

Those two job names are the required status checks on `main` and must match `ci.yml` exactly.
A red build never merges. Watch with `gh pr checks --watch` if `gh` is available — prefer that
built-in flag over a hand-rolled polling loop. **`jq` is not installed in this environment**;
a `gh pr checks --json ... | jq ...` script will silently fail with "command not found" on every
iteration and never detect completion — confirmed the hard way in this session (a coordinating
agent trusted such a loop for several minutes before noticing it had never actually parsed a
result). If you need to parse `gh`'s JSON output yourself, check `which jq` first, or just poll
`gh pr checks <n>`'s plain-text output and grep for the literal words `pending`/`fail`/`pass`.

Merge only once every check passes, then delete the branch.

## Stacked branches

Some work may depend on an unmerged parent branch — e.g. a module's exceptions needing a shared
base class that only exists on another still-open PR. When stacking, target the PR at the parent
branch, or say plainly in the PR body that it must merge after its parent. Do not rebase someone
else's pushed branch without asking. (Two long-abandoned example branches once documented here,
`feat/uber-module-depth` and `fix/phase0-1-stabilize-and-harden`, are stale artifacts from early
in this project's history — `com.lld.config.DomainException` has been a stable, long-merged part
of the shared contract for a long time now. Don't use old branch names as evidence of current
repo state; check `git branch -a` and each branch's actual last-commit date instead.)

## Confirm before acting

Committing and pushing are outward-facing. Unless the user has already said to commit and push,
show what you are about to commit and confirm first. Approval for one push does not carry to the
next.
