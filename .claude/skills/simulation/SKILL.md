---
name: simulation
description: Create or improve a module's interactive 2D simulation/animation tab — the 8-step scene driven by the backend /sim/* endpoints with a live telemetry HUD. Use when the user asks to add, improve, animate, or fix the simulation or demo tab of an LLD module.
---

# Build or improve the interactive 2D simulation

Every reference module has a Simulation tab: an **8-step, user-driven walkthrough** that calls
real backend endpoints and animates what the design is doing. It is the tab that makes a design
legible, so it is worth real effort.

Study one before writing: `SplitwisePage.jsx` (ledger + debt graph),
`ZomatoPage.jsx` (night city map, kitchen smoke, moving scooter — the richest at 1,655 lines),
`UberPage.jsx` (2D city map, headlight beam), `MovieTicketPage.jsx` (seat-race concurrency).

## The non-negotiable rule: it must be real

The simulation calls the backend. It does **not** fake state in React. If the animation shows a
balance updating, that number came from `simGetBalances()`. A hardcoded step sequence that never
touches the API is worthless for demonstrating a design — it demonstrates only the animation.

If the module has no `/sim/*` engine yet, build it first.

## Backend: the isolated `/sim/*` engine

```
POST /api/<key>/sim/reset          → wipes and reseeds the sandbox
POST /api/<key>/sim/<action>       → one per simulation step
GET  /api/<key>/sim/events         → event log with state snapshots
GET  /api/<key>/sim/<state>        → current sandbox state
```

**The sandbox must be a separate instance from live state.** `SplitwiseService` holds both
`repository` and `simRepository`; `CoffeeMachineService` holds `machine` and `simMachine`. The
demo must never mutate the data the operational tabs show.

Events should carry a **state snapshot**, not just a message — that is what lets the UI render a
before/after and what makes replay possible.

## Frontend: the step machine

```jsx
const [step, setStep] = useState(0);
const steps = [
  { title: 'Reset', detail: '...' },
  // ... 8 steps total
];

async function runStep() {
  try {
    if (step === 0)      { await simReset(); }
    else if (step === 1) { const u = await simCreateUser('Alice', 'alice@sim.com'); setUsers(...); }
    // ...
    setStep(step + 1);
  } catch (err) {
    setError(err.message || 'Error executing step');
  }
}
```

Each step advances **only on user click** — no autoplay. The user needs time to read what
happened. Render progress with the shared `.step-indicator` / `.step-dot` classes
(`active` / `done` states).

## What makes a good scene

- **A spatial metaphor for the domain.** A city map for ride-hailing, a cabin layout for
  airline seats, a kitchen for food delivery, a graph topology for debt. Not a list of log lines
  with a fade-in.
- **A live telemetry HUD** showing the state the design actually manages — queue depths, lock
  holders, balances, seat status — updating from the API response each step.
- **Visible concurrency where the design is about concurrency.** For race-condition modules,
  show two actors contending and one losing: which thread took the lock, which got rejected.
  That is the whole point of the module.
- **CSS animation over JS timers** for motion. Keyframes for a moving vehicle, particle drift,
  a pulsing lock indicator.
- **Failure paths, not just the happy path.** Step 6 of a good simulation is usually where
  something is rejected — insufficient change, seat already held, driver unavailable.

## Theme rules — these break silently

Use `var(--bg-primary)`, `var(--text-primary)`, `var(--border-primary)` from
`src/styles/theme.css`. **Check both light and dark.** Simulation scenes are the most frequent
offender: a dark-styled canvas with hardcoded `#1e293b` looks deliberate in dark mode and broken
in light mode. If a scene genuinely needs a fixed dark canvas (a night city map), make that a
deliberate, self-contained surface with its own readable foreground colours — do not let it leak
theme-dependent text onto a fixed background.

## Improving an existing simulation

Diagnose before rewriting. The usual weaknesses, in order of how often they occur:

1. Steps that mutate React state without calling the backend
2. No telemetry HUD, so the state being demonstrated is invisible
3. Only the happy path — no rejection, no contention
4. Hardcoded colours that break in one theme
5. Autoplay timers that outrun reading speed
6. The sim mutating live state instead of a sandbox

## Verify

`npx vitest run && npm run build`, and confirm the entry chunk stays under 500 kB — simulation
code is large, and it must land in the module's own lazy chunk, never the entry. Then `ship`.
