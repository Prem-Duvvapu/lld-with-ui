---
name: rca
description: Add a structured Root Cause Analysis entry to RCA.md with all six required sections after diagnosing and fixing a non-trivial issue. Use when the user asks to document an incident, write an RCA, or immediately after resolving a concurrency race, build failure, port collision, serialization bug or environment discrepancy.
---

# Write an RCA entry

`RCA.md` is the incident log. Per `AGENTS.md`, an entry is **required** after resolving any
non-trivial issue — a concurrency race, build failure, port collision, serialization bug or
environment discrepancy. Add it immediately after the fix, while the diagnostic commands are
still in scrollback.

Existing entries to match in tone and depth:
- RCA-001 — Swagger 404 from an external Windows Tomcat 9 holding port 9090
- RCA-002 — duplicate object-literal keys silently discarding 653 lines of design content
- RCA-003 — domain exceptions surfacing as HTTP 500 with the message stripped
- RCA-004 — eager `import.meta.glob` shipping all 45 pages in the entry chunk

## Format

Append a new numbered section and **add it to the Incident Index at the top of the file**.

```markdown
## RCA-00N: <Specific title naming the mechanism, not the symptom>

**Severity:** Critical | High | Medium | Low
**Date:** YYYY-MM-DD
**Status:** Resolved
**Affected:** <modules, files or subsystems>

### 1. Overview & Severity
What broke, who or what it affected, and why that severity. Two or three sentences.

### 2. Symptoms & Error Logs
What was actually observed — the verbatim error, the wrong output, the silent absence.
Include real log lines and stack traces in fenced blocks. If the failure was silent, say so
explicitly and describe how it eventually surfaced; silent failures are the dangerous ones.

### 3. Root Cause
The actual mechanism, not the surface. "Duplicate keys in one object literal are resolved
last-wins at parse time, before any lookup logic runs" — not "the data was wrong."
Name the exact file and line. If a language or framework behaviour is the cause, state that
behaviour precisely, because that is what makes the entry reusable.

### 4. Diagnostic Commands
The commands that actually located it, with their real output. This is the most reused section
of the file — someone hitting a similar symptom runs these first.

```bash
# Count declared blocks vs surviving keys
grep -c "^  [a-zA-Z-]*: {" src/data/designDetails.js
node -e "import('./src/data/designDetails.js').then(m => console.log(Object.keys(m.default).length))"
```

### 5. Step-by-Step Resolution
Numbered, in the order performed. Include the verification step that proved the fix — a test
that now passes, a byte count, a green suite. A resolution without verification is a hypothesis.

### 6. Preventative Measures
What stops recurrence. Strongly prefer an automated guard over a written rule:
- the test that now fails if this regresses (name it)
- the CI gate added
- the `AGENTS.md` / `CLAUDE.md` convention updated

A preventative measure of "be more careful" is not one.
```

## What makes an entry worth having

- **Name the mechanism in the title.** "Duplicate Object-Literal Keys Silently Discarding Design
  Content" tells a future reader whether it applies to them; "Design data bug" does not.
- **Quantify.** 653 lines discarded, 1,474 kB → 260 kB, 14 modules improved / 0 regressions.
- **Record what misled you.** If a Lombok cascade produced 30 spurious "cannot find symbol"
  errors that were all one real error, that is the most valuable line in the entry — it is what
  saves the next person an hour.
- **Every entry should end in a test.** If the fix cannot be guarded by one, explain why.

Renumber nothing. New entries get the next number; the index at the top gets a new row.
