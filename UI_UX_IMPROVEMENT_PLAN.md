# LLD-with-UI — UI/UX + Bug-Fix Overhaul Plan

> **Purpose**: Phased, actionable improvement plan for the LLD-with-UI portfolio project.
> Designed to be executed module-by-module by a separate implementation model (Gemini).
> Each phase contains: task description, files touched, acceptance criteria, and complexity.

---

## Table of Contents

1. [Codebase Audit Findings](#phase-1-codebase-audit)
2. [Design System Foundation](#phase-2-design-system-foundation)
3. [Shared Component Library](#phase-3-shared-component-library)
4. [Per-Module UX Pass](#phase-4-per-module-ux-pass)
5. [Design Details Content Overhaul](#phase-5-design-details-content-overhaul)
6. [Execution Plan for Gemini](#phase-6-execution-plan-for-gemini)

---

## Phase 1: Codebase Audit

### 1.1 — Critical Bug: Per-Module `<style>` Tags Override Global Theme ⚠️

**Severity**: HIGH — breaks theming for every module

**Problem**: 20+ modules inject `<style>` tags containing `* { margin: 0; padding: 0; box-sizing: border-box; }` AND `body { ... }` rules with hardcoded colors. These override `theme.css` CSS custom properties and break light/dark theme switching.

**Affected modules** (confirmed via code scan):
- Zomato (`body { background: #f0f2f5; color: #333 }`)
- Uber (`body { background: #f0f2f5; color: #333 }`)
- Splitwise (`body { background: linear-gradient(135deg, #667eea, #764ba2) }`)
- Snake & Ladders (`body { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: #eee }`)
- ATM (`body { background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); font-family: 'Courier New' }`)
- Elevator (`body { background: #f0f2f5; color: #333 }`)
- Tic Tac Toe, StackOverflow, Library, Movie Ticket, Hotel, Digital Wallet, Coffee Machine, Chess, Ludo, Inventory, Shopping Cart, Minesweeper, Vending Machine

**Consequence**: Navigating between modules persistently mutates `body` styles. Theme toggle has no effect on hardcoded colors. Background bleeds across route changes.

**Fix strategy**:
1. Remove all `body { }` and `* { }` rules from per-module `<style>` tags
2. Scope all per-module styles under a module-specific class (e.g., `.parking-app`, `.zomato-app`)
3. Replace all hardcoded color values (`#333`, `#f0f2f5`, `#e23744`, etc.) with CSS custom properties from `theme.css`
4. The global reset already exists in `theme.css` lines 64–68; per-module duplicates are redundant

**Complexity**: M (systematic find-and-replace across ~20 files, but mechanical)

---

### 1.2 — Critical Bug: ClassDiagram Relationship Lines Never Render

**Severity**: HIGH — class diagram feature is visually broken

**Problem**: In `ClassDiagram.jsx` (lines 36–62), relationship lines use `document.querySelector('[data-class="..."]')` to find class box elements and draw SVG bezier curves between them. However, the class box `<div>` elements never have a `data-class` attribute set — the JSX at line 19 only sets `style={{ borderTopColor: ... }}` but no `data-class` prop.

**Consequence**: `fromEl` and `toEl` are always `null`. All relationship lines silently fail to render. Class diagrams show isolated boxes with no connections.

**Fix**: Add `data-class={cls.name}` to each `<div key={cls.name} className="cd-class-box">` element.

**Complexity**: S (1 line change)

---

### 1.3 — Bug: API Calls Never Check `res.ok` Status

**Severity**: MEDIUM — silent failures on HTTP errors

**Problem**: Every `api.js` file (except Splitwise's) follows this pattern:
```javascript
const res = await fetch(`${BASE_URL}/endpoint`);
return res.json(); // No check for res.ok — 400/500 responses still parse
```

If the backend returns a 400/500, `res.json()` may still succeed (Spring returns error JSON), but the frontend treats it as a valid response. Or worse, on network issues, `res.json()` throws and the catch block shows a generic "Failed to connect" message instead of the actual error.

**Fix**: Create a shared `apiFetch` utility that:
1. Checks `res.ok`
2. Parses error body on failure
3. Throws a structured error with the backend's message
4. Is used by all 45 `api.js` files

**Complexity**: M (create utility + update all api.js files)

---

### 1.4 — Bug: Polling Intervals Not Cleaned Up on Tab Switch

**Severity**: MEDIUM — resource leak, unnecessary network requests

**Problem**: Several modules start `setInterval` polling in components that only render when their tab is active (e.g., `SpotGrid`, `ActiveTickets` in Parking, elevator `fetchElevators`). When you switch tabs within the same page component, the sub-component unmounts and the cleanup runs. **However**, when you navigate to a different route entirely (e.g., go back to Home), the `setInterval` in some modules lacks proper cleanup because the interval is stored in a local variable inside `useEffect` but the component's mounted state check is missing.

**Specific issue — Elevator**: The `AnimatedFlow` component at line 272 creates a `setInterval(poll, 1000)` and another `setInterval(ticker, 1000)` at line 293, but neither is stored in a ref that gets cleaned up if the user navigates away mid-animation. The `mountedRef` check inside the interval prevents state updates but doesn't clear the interval itself.

**Specific issue — Parking AnimatedFlow**: `timerRef.current` at line 579 is cleared in the cleanup effect at line 460, but `intervalRef` is never set in the current `startFlow()` — the setTimeout/vehicleEntry callbacks don't assign anything to `intervalRef.current`.

**Fix**: Store all interval IDs in refs and clear them in `useEffect` cleanup. Add `AbortController` to in-flight fetch calls.

**Complexity**: M (systematic across modules with polling)

---

### 1.5 — Bug: ATM Mutates `account` Object Directly

**Severity**: MEDIUM — stale balance display after operations

**Problem**: In `AtmPage.jsx` lines 142–143 and 163, after a successful withdrawal/deposit, the code does:
```javascript
account.balance -= amount;  // Direct mutation of prop/parent state
```
This mutates the object reference without going through React's state update mechanism. React won't re-render components that depend on `account.balance` because the object reference hasn't changed.

**Fix**: Use a state update function that creates a new object: `setAccount(prev => ({...prev, balance: prev.balance - amount}))`.

**Complexity**: S

---

### 1.6 — Bug: Elevator `@Scheduled(fixedRate = 1500)` Conflicts with Manual Tick

**Severity**: LOW — confusing but not crash-inducing

**Problem**: `ElevatorService.java` line 144 runs `tick()` automatically every 1.5 seconds via `@Scheduled`. The frontend's animated flow ALSO calls `POST /api/elevator/tick` manually at 1-second intervals (line 293). Both paths acquire the same `ReentrantLock`, so they won't corrupt state, but they cause double-speed movement during animated demos and unpredictable floor jumps.

**Fix**: Either:
- Disable `@Scheduled` and let the frontend drive ticks (simpler), or
- Have the frontend poll `GET /elevators` without triggering additional ticks during simulation

**Complexity**: S

---

### 1.7 — Audit: Inconsistent Module Architecture (Two Patterns)

**Finding**: The 45 frontend modules follow two completely different architectural patterns:

**Pattern A — "Full Custom" (21 modules)**: Parking, Zomato, Uber, StackOverflow, TicTacToe, SnakeLadders, ATM, Splitwise, Elevator, Library, MovieTicket, Hotel, Airline, CoffeeMachine, DigitalWallet, Chess, Ludo, Inventory, ShoppingCart, Minesweeper, VendingMachine
- Each has its own `<style>` tag with hundreds of lines of CSS
- Own header, nav, back button
- Directly imports `ClassDiagram` and `DesignDetails` components
- No shared page wrapper

**Pattern B — "LldPage Wrapper" (24 modules)**: LoggingFramework, TrafficSignal, TaskManagement, LinkedIn, LruCache, PubSub, CarRental, Auction, Restaurant, SocialNetwork, ConcertTicket, CricInfo, CourseRegistration, StockBrokerage, MusicStreaming, FooBar, ZeroEvenOdd, FizzBuzz, H2O, TtlCache, ConcurrentHashMap, BlockingQueue, BloomFilter, MergeSort
- Uses `LldPage` wrapper for consistent header/nav/tabs
- CSS still embedded but scoped to module content area

**Impact**: Two entirely different page structures make any cross-cutting UI change (nav, header, tab styling) require touching 45 files in two different ways.

**Fix**: Migrate all 21 "Full Custom" modules to use the `LldPage` wrapper, then enhance `LldPage` as the single source of truth for layout.

**Complexity**: L (21 modules to migrate, but each migration is mechanical)

---

### 1.8 — Audit: Hardcoded Colors in Inline Styles

**Finding**: Even modules that do use CSS variables often fall back to hardcoded colors in inline styles. Examples:
- `SpotGrid` line 328: `color: '#4ecdc4'` (hardcoded teal)
- `SpotGrid` line 329: `color: '#888'` (hardcoded gray)
- `SpotGrid` line 330: `background: '#0d1117'`, `color: '#eee'` (dark-only colors)
- `ActiveTickets` line 388: `color: '#eee'` (hardcoded white)
- `LldPage.jsx` line 18: `color: '#888'` (hardcoded)
- `LldPage.jsx` line 22: `border: ... '#333'`, `color: '#888'` / `'#667eea'` (all hardcoded)
- Exitform line 286: `color: '#98c379'` (hardcoded green)

These cause readability issues when the global theme changes — light-on-light or dark-on-dark text.

**Complexity**: M (find-and-replace across all inline styles)

---

## Phase 2: Design System Foundation

### 2.1 — Enhanced Theme Token System

**Current state**: `theme.css` has 31 tokens for light and dark themes — good foundation but missing:
- **Type scale**: No defined font sizes, line heights, or font weight tokens
- **Spacing scale**: No consistent spacing tokens (every module invents its own padding/margin)
- **Motion tokens**: No transition duration/easing variables (each component uses ad-hoc `0.2s`, `0.3s`, `cubic-bezier(...)`)
- **Border radius scale**: Each module uses different values (6px, 8px, 10px, 12px, 16px, 20px)
- **Z-index scale**: No layering system (modals use arbitrary z-index: 10, 1000)
- **Focus/interactive tokens**: No `:focus-visible` ring color or disabled opacity standard

**Proposed token additions to `theme.css`**:

```
/* Type Scale */
--font-xs: 11px;       /* badges, captions */
--font-sm: 13px;       /* secondary text, labels */
--font-base: 15px;     /* body text */
--font-lg: 18px;       /* section headings */
--font-xl: 24px;       /* page titles */
--font-2xl: 32px;      /* hero headings */
--font-mono: 'Fira Code', 'Courier New', monospace;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Spacing Scale (4px base) */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;

/* Border Radius */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;
--radius-full: 9999px;

/* Motion */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Z-index */
--z-base: 1;
--z-dropdown: 100;
--z-sticky: 200;
--z-modal: 500;
--z-overlay: 900;
--z-toast: 1000;

/* Interactive */
--focus-ring: 0 0 0 3px rgba(102, 126, 234, 0.25);
--disabled-opacity: 0.45;
```

**Typography**: Add Google Font `Inter` via a `<link>` tag in `index.html`. Keep `Fira Code` for code blocks. Use `Inter` as the base body font instead of system defaults.

**Files touched**: `frontend/src/styles/theme.css`, `frontend/index.html`

**Acceptance criteria**:
- All tokens defined in `:root` and `[data-theme='dark']`
- `body` uses `var(--font-sans)` and `var(--font-base)`
- Dark theme has appropriate adjustments for any new tokens
- No visual regression on Home page

**Complexity**: M

---

### 2.2 — Library Recommendation: Framer Motion (Lightweight) + No Component Library

**Recommendation**: Add **Framer Motion** (~32KB gzip) for:
- Page transitions (route change fade/slide)
- AnimatedFlow step transitions (mount/unmount animations)
- Elevator car movement (spring physics)
- Micro-interactions (button press, card hover, modal open/close)

**Do NOT add** a component library (Radix, Headless UI, MUI). Reasons:
1. This is a portfolio project — hand-crafted components demonstrate frontend skill
2. 45 modules already have working interactive components
3. Adding Radix would require rewriting all modals, dropdowns, tabs — massive scope
4. The real problem is inconsistency, not missing primitives

**Do NOT add** Tailwind CSS. Reasons:
1. 20+ modules already have hundreds of lines of vanilla CSS
2. Migrating would be a full rewrite with no portfolio benefit
3. CSS custom properties already provide a design system mechanism

**Installation**: `npm install framer-motion`

**Complexity**: S (install only, usage in later phases)

---

## Phase 3: Shared Component Library

### 3.1 — Refactor `LldPage` Wrapper as Universal Page Shell

**Current state**: `LldPage.jsx` is 36 lines, used by 24 modules. The other 21 modules each reimplement their own header, nav, back button, and tab system.

**Proposed `LldPage` v2 features**:
1. **Consistent header**: Module icon + title + subtitle, using design tokens
2. **Tab system**: Pill-style tabs using CSS variables (not hardcoded colors)
3. **Back navigation**: Consistent "← Back to Home" link
4. **Content area**: Max-width constrained, padding from spacing scale
5. **ThemeToggle**: Already handled by `App.jsx` Layout — no duplication needed
6. **Breadcrumb**: "Home > Module Name" for context
7. **Tab persistence**: Remember last active tab per module in sessionStorage

**Files**: `frontend/src/components/LldPage.jsx`, `frontend/src/components/LldPage.css`

**Acceptance criteria**:
- All 45 modules use `LldPage` as their page shell
- Removing a module's custom header/nav/back-button code doesn't break its functionality
- Tab styling is identical across all modules
- Responsive: tabs wrap on mobile

**Complexity**: L (create component + migrate 21 modules)

---

### 3.2 — Shared UI Components

Create these reusable components in `frontend/src/components/ui/`:

| Component | Purpose | Used By |
|-----------|---------|---------|
| `Button.jsx` + `Button.css` | Primary, secondary, danger, ghost variants. Loading state. | All 45 modules (replacing `btn-primary`, `flow-btn`, `sw-btn`, `atm-btn`, etc.) |
| `Card.jsx` + `Card.css` | Content container with optional header, body, footer. | Result cards, entity cards, ride cards, order cards |
| `Badge.jsx` | Status badges (ACTIVE, COMPLETED, MOVING, etc.) with semantic colors | Elevator, Zomato, Uber, ATM, Parking |
| `Input.jsx` + `Select.jsx` | Themed form controls | Entry/exit forms, booking forms |
| `Table.jsx` | Themed data table with optional sorting | Tickets, transactions, questions |
| `Toast.jsx` | Dismissable notification for success/error feedback | All modules (replacing inline `.error` / `.success` divs) |
| `Modal.jsx` | Centered overlay dialog with animation | Ticket popups, receipts, completion dialogs |
| `EmptyState.jsx` | Illustration + message for empty data | All modules (replacing `<div className="alert">No data</div>`) |
| `Skeleton.jsx` | Loading placeholder shapes | All modules (replacing text "Loading...") |
| `StepIndicator.jsx` | Horizontal step dots for multi-step flows | Parking, Zomato, Uber, ATM, Elevator, Splitwise (all redeclare `.step-dot` CSS) |
| `TabNav.jsx` | Pill-style horizontal tabs | Integrate into `LldPage` |

**Design principles for each component**:
- Use CSS custom properties from `theme.css` exclusively (no hardcoded colors)
- Accept `className` prop for per-module overrides
- Use `framer-motion` for mount/unmount animations where appropriate
- Support keyboard navigation (focus management)
- Include `aria-` attributes for accessibility

**Acceptance criteria per component**:
- Renders correctly in both light and dark theme
- Has no hardcoded color values
- Used by at least 3 modules
- Keyboard accessible (Tab, Enter, Escape)

**Complexity**: L (10+ components, each S individually)

---

### 3.3 — Shared API Utility

Create `frontend/src/utils/api.js`:

```javascript
const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  
  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new ApiError(res.status, body?.error || body?.message || `HTTP ${res.status}`, body);
  }
  
  return res.json();
}
```

Each module's `api.js` refactored to use `apiFetch`:
```javascript
import { apiFetch } from '../../utils/api';
export const getGates = () => apiFetch('/parking/gates');
export const vehicleEntry = (gateId, vehicleNumber, vehicleType) =>
  apiFetch('/parking/entry', { method: 'POST', body: JSON.stringify({ gateId, vehicleNumber, vehicleType }) });
```

**Acceptance criteria**:
- All 45 `api.js` files use `apiFetch`
- HTTP errors throw `ApiError` with status and backend message
- No more silent 400/500 responses parsed as success

**Complexity**: M

---

### 3.4 — Shared Polling Hook

Create `frontend/src/hooks/usePolling.js`:

```javascript
import { useEffect, useRef } from 'react';

export function usePolling(fetchFn, intervalMs, deps = []) {
  const abortRef = useRef(null);
  
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    abortRef.current = controller;
    
    const poll = async () => {
      if (!active) return;
      try { await fetchFn(controller.signal); }
      catch (e) { if (e.name !== 'AbortError') console.error(e); }
    };
    
    poll();
    const id = setInterval(poll, intervalMs);
    
    return () => {
      active = false;
      clearInterval(id);
      controller.abort();
    };
  }, deps);
}
```

Replaces all `useEffect(() => { fetch(); const i = setInterval(fetch, 5000); return () => clearInterval(i); }, [])` patterns.

**Acceptance criteria**:
- No `setInterval` calls remain in module page files
- All polling stops when component unmounts
- In-flight fetch calls are aborted on cleanup

**Complexity**: M

---

## Phase 4: Per-Module UX Pass

> For each module: **Before → After** critique, specific animation specs, and what "done" looks like.

### 4.1 — Parking Lot

**Before problems**:
- Animated demo has 20+ state variables managing car position, person position, timers, gate bars — fragile state machine
- SpotGrid filter dropdown uses hardcoded dark-mode colors (`background: '#0d1117'`)
- "Away" timer is just a number counting up with no context of what it represents
- Spot grid doesn't show vehicle info when occupied
- Animated demo uses hardcoded pixel positions for car movement — breaks on different screen widths

**After goals**:
- Animation: Car slides along a CSS path, gate bar rotates up/down with spring easing. Ticket popup uses `<Modal>` component. Timer shows a friendly "15m parking" countdown with activity animation.
- Spot grid: Hovering an occupied spot shows vehicle number and entry time in a tooltip
- Responsive: Animated scene uses `%` positions or `viewBox`-based SVG instead of pixel math

**Animation specs**:
- Gate bar rotation: `transform: rotate(-90deg)`, duration `var(--duration-slow)`, easing `var(--ease-spring)`
- Car horizontal movement: `left: X%`, duration `1.5s`, easing `var(--ease-out)`
- Ticket popup: Framer Motion `initial={{ scale: 0.5, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}`, spring damping
- Step indicator: Each dot fills with `var(--success)` via transition, active dot pulses

**Complexity**: L

---

### 4.2 — Zomato (Food Delivery)

**Before problems**:
- Entire page uses hardcoded `#e23744` (Zomato red) and `#f0f2f5` background — doesn't respond to theme
- Restaurant cards have no food images/icons — just text
- Order status progression is just a badge text change — no visual progress bar
- Cart persists no visual feedback when items are added (no micro-animation, no toast)
- Animated demo moves a bike emoji across a road — cute but choppy

**After goals**:
- Replace hardcoded colors with CSS variables; accent can remain reddish but defined as `--module-accent: var(--danger)` or a custom token
- Add food emoji icons next to menu items for visual interest
- Order status: Horizontal stepper showing all states (PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED) with the current state highlighted and animated progress line
- Cart: Item add triggers a subtle slide-in + badge count pulse animation
- Animated demo: Smoother bike movement with CSS `transition`, steam animation from kitchen

**Animation specs**:
- Order stepper: Connected dots with a filling line between them. Active state glows. Use Framer Motion `layoutId` for state badge transitions.
- Cart badge: `framer-motion` scale spring from 1.0 → 1.2 → 1.0 on item add
- Bike movement: `left: 0%` → `left: 80%`, `transition: left 2.5s var(--ease-out)`, not jerky setTimeout-based repositioning

**Complexity**: M

---

### 4.3 — Uber (Cab Booking)

**Before problems**:
- Uses hardcoded black/white styling — doesn't respond to theme at all
- No map visualization — just dropdown selectors for lat/lng locations
- Ride status transitions are just badge swaps with no spatial context
- Estimate and booking are separate actions but feel disconnected
- Vehicle type cards have no visual differentiation beyond text

**After goals**:
- Theme-aware with black accent as `--module-accent`
- Ride flow: Simple schematic showing pickup dot → route line → drop dot, with car icon moving along the line as status progresses
- Vehicle type cards: Different sizes/silhouettes for Go vs XL vs Premium
- Status progression: Uber-style horizontal stepper with ETA countdown
- Combined estimate + book: Show estimate inline, then "Book Now" converts the estimate card into a booking confirmation

**Animation specs**:
- Car movement along route: CSS `offset-path` on a straight line between pickup/drop markers
- Status stepper: Same pattern as Zomato but with Uber's dark accent
- Vehicle card selection: Selected card scales up slightly with a border glow

**Complexity**: M

---

### 4.4 — Stack Overflow

**Before problems**:
- White/light-only colors don't respect theme
- Question list is just text — no visual hierarchy between title, tags, vote count
- Voting buttons are plain text links — no spatial affordance for up/down
- No syntax highlighting in question/answer bodies
- "Ask Question" flow is bare input fields

**After goals**:
- Theme-aware question cards with vote column on the left (like real SO)
- Vote buttons: Larger up/down arrows with filled state, vote count centered between them
- Tag pills with category colors
- Accept answer: Green checkmark with satisfying animation
- Question list: Show answer count, view count badges like real SO

**Animation specs**:
- Vote: Number counter animates up/down on change (Framer Motion `animate={{ y: [0, -10, 0] }}`)
- Accept answer: Checkmark scales in with spring
- Skip heavy syntax highlighting — not worth the bundle size for interview prep

**Complexity**: M

---

### 4.5 — Tic Tac Toe

**Before problems**:
- Grid is functional but visually plain
- No celebration animation on win
- No indication of whose turn it is beyond text
- Draw state is just text

**After goals**:
- 3x3 grid with hover states showing ghost X/O
- Turn indicator: Pulsing highlight on current player's symbol
- Win: Winning line draws across the three cells with a glow effect, confetti optional
- Draw: Shake animation on the grid
- Reset: Grid cells fade out and back in

**Animation specs**:
- Cell place: X/O scales from 0 to 1 with `var(--ease-spring)` bounce
- Win line: SVG line that animates `stroke-dashoffset` from full to 0
- Turn indicator: Soft pulse glow using `box-shadow` animation

**Complexity**: S

---

### 4.6 — Snake & Ladders

**Before problems**:
- Board uses dark gradient background hardcoded — no theme support
- Snake/ladder connections are just text mappings, not visible on the board
- Dice roll is a number change — no rolling animation
- Player tokens don't animate movement

**After goals**:
- 10x10 board grid with alternating colored rows (like a real board)
- Snakes and ladders drawn as colored lines/paths on the board
- Dice: 3D-ish dice face that rotates/shakes on roll
- Player tokens: Slide from current position to new position, with a bounce on snakes (down) and a float on ladders (up)
- Current player's token pulses

**Animation specs**:
- Dice roll: `transform: rotate(720deg)` over `0.6s` with random face selection
- Token movement: `transition: left 0.5s, bottom 0.5s` with stepped path for multi-cell moves
- Snake encounter: Token slides down the snake path with `var(--ease-out)`, slight shake at landing
- Ladder encounter: Token rises up with `var(--ease-spring)`

**Complexity**: M

---

### 4.7 — ATM

**Before problems**:
- Uses CRT-green-on-black aesthetic which is distinctive but completely ignores the global theme
- Keypad buttons work but are visually tiny on mobile
- PIN entry auto-submits at 4 digits via `useEffect([pin])` — creates a race condition with `handlePinSubmit` being called twice (once from the effect, once from `handleKeypadPress('enter')`)
- Balance directly mutated (see Bug 1.5)
- No visual "processing" state beyond blinking text

**After goals**:
- Keep the ATM-machine aesthetic as a deliberate design choice — it's portfolio-differentiating
- But make it theme-aware: dark theme = classic green CRT, light theme = modern LCD blue
- Fix the double-submit PIN bug
- Keypad: Larger touch targets (48px minimum per WCAG)
- Processing: Card insert animation, cash dispensing animation with denomination breakdown
- Receipt: Slide-up animation with paper texture
- Transaction history: Scrollable list with credit/debit color coding

**Animation specs**:
- Card insert: Card emoji slides from right to center of slot
- Cash dispense: Bills fan out from dispenser slot
- Screen transitions: Old-CRT-style flicker between screens (just a brief opacity blink)
- PIN dots: Each dot scales in with spring on digit entry

**Complexity**: M

---

### 4.8 — Splitwise

**Before problems**:
- Body background is `linear-gradient(135deg, #667eea, #764ba2)` — hardcoded, ignores theme
- Balance display is just text numbers — hard to scan who owes whom
- Expense split visualization is functional but not scannable at a glance
- Settle up flow requires manual amount entry — should suggest optimal settlements

**After goals**:
- Theme-aware gradient as page accent (not body override)
- Balance dashboard: Each user shows a bar graph of who they owe / who owes them
- Positive balances = green, negative = red, settled = gray
- Expense list: Cards with split breakdown as a horizontal stacked bar
- Settle up: Show suggested settlements (A pays B ₹X) with one-tap settle
- Group view: Member avatars in a horizontal strip

**Animation specs**:
- Balance bars: Grow from 0 to final width on mount, `var(--duration-slow)`, `var(--ease-out)`
- Expense card: Slide in from right on creation
- Settle up: Check mark scales in, balance bars animate to 0

**Complexity**: M

---

### 4.9 — Elevator

**Before problems**:
- Building grid uses hardcoded `#1a1a2e`, `white`, `#f0f2f5` — no theme support
- Elevator cars are positioned by floor match (`el.currentFloor === floor`) — no smooth transition between floors, just instant teleportation
- The main view and simulation have completely different visual styles
- Floor buttons send hardcoded `from, from+1` or `from, from-1` — not realistic (user should select destination)
- Info panel cards use hardcoded colors

**After goals**:
- Building view: Each elevator car smoothly animated between floors using `bottom: calc(floorIndex * rowHeight)` with CSS transition
- Floor call: Two-step — press up/down to call, then select destination floor from the elevator panel
- Elevator car: Shows door open/close animation when stopped, capacity bar below car
- Theme-aware: All colors from CSS variables
- Unified style between main view and simulation

**Animation specs**:
- Elevator movement: `transition: bottom 0.8s var(--ease-in-out)` — car slides between floors
- Door animation: Two half-width panels slide apart on stop, slide back together before moving
- Call button: Lights up (stays highlighted) while elevator is en route
- Arrival ding: Visual pulse on elevator car when it arrives at a called floor

**Complexity**: L

---

### 4.10–4.45 — Remaining 36 Modules

The remaining modules (Library, MovieTicket, Hotel, Airline, CoffeeMachine, DigitalWallet, Chess, Ludo, Inventory, ShoppingCart, Minesweeper, VendingMachine, LoggingFramework, TrafficSignal, TaskManagement, LinkedIn, LruCache, PubSub, CarRental, Auction, Restaurant, SocialNetwork, ConcertTicket, CricInfo, CourseRegistration, StockBrokerage, MusicStreaming, FooBar, ZeroEvenOdd, FizzBuzz, H2O, TtlCache, ConcurrentHashMap, BlockingQueue, BloomFilter, MergeSort) follow the same patterns.

**Common fixes needed for all**:
1. Replace hardcoded colors with CSS variables
2. Migrate to `LldPage` wrapper (if not already using it)
3. Replace `setInterval` with `usePolling` hook
4. Use `apiFetch` in api.js
5. Use shared `Button`, `Card`, `Badge`, `Table`, `EmptyState` components
6. Add loading skeletons instead of "Loading..." text
7. Add error boundaries with retry buttons

**Per-module UX priorities** (do these in batches):

**Batch 1 — Games** (Chess, Ludo, Minesweeper):
- Board visualizations with piece/cell animations
- Turn indicators, game-over celebrations
- Chess: piece drag-and-drop or click-to-select-click-to-move

**Batch 2 — Real-world Machines** (CoffeeMachine, VendingMachine, DigitalWallet):
- Skeuomorphic machine UI (already partially done for ATM/CoffeeMachine)
- Ensure theme awareness while keeping distinctive appearance

**Batch 3 — Platforms** (LinkedIn, SocialNetwork, CricInfo, MusicStreaming, StockBrokerage):
- Dashboard-style layouts with cards, feeds, lists
- Real-time data displays (stock tickers, live scores)

**Batch 4 — Data Structures & Concurrency** (LruCache, TtlCache, ConcurrentHashMap, BlockingQueue, BloomFilter, MergeSort, FooBar, ZeroEvenOdd, FizzBuzz, H2O):
- Algorithm visualization with step-by-step animation
- Thread/sequence diagrams showing concurrent execution

**Complexity**: L (but each individual module is S–M)

---

## Phase 5: Design Details Content Overhaul

### 5.1 — New DesignDetails Component Structure

**Current problems**:
- All 6 sections (Requirements, Entities, Patterns, Principles, OOP, Extensibility) render as one continuous scroll — wall-of-text in interviews
- Entity tables show every field and method — overwhelming for quick review
- No cross-references to the class diagram
- No way to quickly navigate to a specific section
- Same structure for all modules — no contextual emphasis

**Proposed new structure** — tabbed/accordion hybrid:

```
┌─────────────────────────────────────────────────┐
│  📋 Requirements  │  🏗️ Entities  │  🧩 Patterns  │  ⚙️ SOLID  │  🔧 Extend  │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Active tab content here]                      │
│                                                 │
│  Entities tab: Collapsible cards per entity      │
│  ┌─ ParkingLotService ──────────────── ▼ ──┐   │
│  │ Core business logic layer...             │   │
│  │ [Expand to see fields/methods table]     │   │
│  └──────────────────────────────────────────┘   │
│  ┌─ SpotAssignmentStrategy ────────── ▶ ──┐   │
│  │ (collapsed — click to expand)           │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  Patterns tab: Cards with ✓/✗ + one-line why   │
│  SOLID tab: Principle → concrete code ref       │
│  Extend tab: Difficulty-sorted roadmap          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Key improvements**:
1. **Sub-tabs** within the Design Details section so you can jump directly to "Patterns" during an interview
2. **Collapsible entity cards** — show name + one-line description by default, expand for field/method tables
3. **Cross-references**: Each entity card links to its box in the class diagram (scroll-to + highlight)
4. **Interview quick-view**: A "TL;DR" summary at the top of each section — 3–5 bullet points for someone who has 2 minutes to review
5. **Search/filter**: Filter entities by name, patterns by used/unused
6. **Code snippets**: Show the actual Java class signature (one line) next to each entity to ground it in real code

**Component structure**:
```
DesignDetails.jsx        (outer shell with sub-tabs)
├── RequirementsTab.jsx  (bullet list with numbered requirements)
├── EntitiesTab.jsx      (collapsible cards with field/method tables)
├── PatternsTab.jsx      (cards: used/unused, name, one-line explanation)
├── PrinciplesTab.jsx    (SOLID + OOP merged into one coherent view)
└── ExtensibilityTab.jsx (difficulty-sorted cards with estimated effort)
```

**Files**: `frontend/src/components/DesignDetails.jsx` (refactor), `frontend/src/components/design/` (new sub-components)

**Acceptance criteria**:
- Loads instantly (no data fetching — static JSON)
- Each sub-tab renders in < 16ms (no jank on tab switch)
- Entity cards are collapsed by default (reduces visual noise)
- Works in both light and dark theme
- Same component used by all 45 modules with no per-module code

**Complexity**: L

---

### 5.2 — Design Details Data Enrichment

**Current state**: `designDetails.js` is 300KB / 4000 lines of structured data. Each module has the same 6 sections.

**Proposed additions to each module's data**:
1. **`tldr`**: 3–5 bullet summary for quick interview review
2. **`interviewTips`**: Common follow-up questions an interviewer might ask, with suggested answers
3. **`codeSignatures`**: Map of entity name → Java class signature for cross-referencing
4. **`tradeoffs`**: Key design tradeoffs made and why (e.g., "Used Strategy over State Machine for pricing because prices don't have state transitions")
5. **`complexity`**: Time/space complexity of key operations

**Do NOT add**: Paragraph-length prose. Keep everything in structured data format for programmatic rendering.

**Complexity**: M (content creation, not code)

---

## Phase 6: Execution Plan for Gemini

### Task Dependency Graph

```
                    ┌─────────────┐
                    │   Phase 2.1  │  Theme tokens
                    │   theme.css  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼──────┐ ┌──▼───────┐ ┌──▼───────┐
        │  Phase 3.3  │ │ Phase 3.4│ │ Phase 3.2│
        │  apiFetch   │ │usePolling│ │  UI Comps│
        └─────┬──────┘ └──┬───────┘ └──┬───────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │  Phase 3.1   │  LldPage v2
                    │  Page Shell  │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────────┐
            │              │                  │
      ┌─────▼──────┐ ┌────▼─────┐  ┌────────▼────────┐
      │  Phase 1.1  │ │Phase 1.2 │  │   Phase 5.1      │
      │ Fix body    │ │Fix class │  │   DesignDetails  │
      │ overrides   │ │ diagram  │  │   refactor       │
      └─────┬──────┘ └────┬─────┘  └────────┬────────┘
            │              │                  │
            └──────────────┼──────────────────┘
                           │
               ┌───────────┼───────────┐
               │           │           │
         ┌─────▼──┐  ┌────▼───┐ ┌────▼────┐
         │Phase 4  │  │Phase 4 │ │Phase 4  │
         │Core 9   │  │Batches │ │Batches  │
         │modules  │  │2 & 3   │ │4 (DS)   │
         └────────┘  └────────┘ └─────────┘
```

### Sequenced Tasks

---

#### **Sprint 0: Infrastructure** (do this first, touches shared files)

| # | Task | Files | AC | Size |
|---|------|-------|----|------|
| 0.1 | Expand `theme.css` with type/spacing/motion/z-index tokens + add Inter font | `theme.css`, `index.html` | All tokens defined. Body uses Inter. Dark theme has adjustments. Home page looks the same. | M |
| 0.2 | Create `apiFetch` utility | `src/utils/api.js` (new) | Exports `apiFetch` and `ApiError`. Checks `res.ok`. Parses error bodies. | S |
| 0.3 | Create `usePolling` hook | `src/hooks/usePolling.js` (new) | Exports `usePolling(fn, ms, deps)`. Cleanup aborts fetch + clears interval. | S |
| 0.4 | Install Framer Motion | `package.json` | `npm install framer-motion` succeeds. No bundle size regression > 35KB gzip. | S |
| 0.5 | Fix ClassDiagram `data-class` bug | `src/components/ClassDiagram.jsx` | Add `data-class={cls.name}` to class box div. Relationship lines render as SVG curves. | S |

**⚠️ All Sprint 0 tasks MUST complete before any per-module work begins.**

---

#### **Sprint 1: Shared Components** (depends on Sprint 0)

| # | Task | Files | AC | Size |
|---|------|-------|----|------|
| 1.1 | Create `Button` component | `src/components/ui/Button.jsx`, `Button.css` | Primary, secondary, danger, ghost variants. Loading spinner state. Uses CSS variables only. | S |
| 1.2 | Create `Card` component | `src/components/ui/Card.jsx`, `Card.css` | Header/body/footer slots. Hover elevation. Theme-aware. | S |
| 1.3 | Create `Badge` component | `src/components/ui/Badge.jsx` | Semantic color variants (success/warning/danger/info/neutral). Size variants. | S |
| 1.4 | Create `Input` + `Select` components | `src/components/ui/Input.jsx`, `Select.jsx` | Focus ring, error state, label, helper text. Theme-aware. | S |
| 1.5 | Create `Table` component | `src/components/ui/Table.jsx`, `Table.css` | Striped rows, hover highlight, sticky header option. Theme-aware. | S |
| 1.6 | Create `Toast` notification system | `src/components/ui/Toast.jsx`, `ToastContext.jsx` | `useToast()` hook. Auto-dismiss. Success/error/info variants. Framer Motion enter/exit. | M |
| 1.7 | Create `Modal` component | `src/components/ui/Modal.jsx` | Backdrop overlay. Escape to close. Focus trap. Framer Motion scale animation. | S |
| 1.8 | Create `EmptyState` component | `src/components/ui/EmptyState.jsx` | Icon + title + description + optional action button. | S |
| 1.9 | Create `Skeleton` loader | `src/components/ui/Skeleton.jsx` | Shimmer animation. Rectangular, circular, text-line variants. | S |
| 1.10 | Create `StepIndicator` component | `src/components/ui/StepIndicator.jsx` | Horizontal dots/line. Active/done/pending states. Animated transitions. | S |
| 1.11 | Refactor `LldPage` v2 | `src/components/LldPage.jsx`, `LldPage.css` | Tab system with pills. Back nav. Breadcrumb. Uses all CSS variables. Responsive tabs. | M |

---

#### **Sprint 2: DesignDetails Overhaul** (depends on Sprint 1.11)

| # | Task | Files | AC | Size |
|---|------|-------|----|------|
| 2.1 | Refactor `DesignDetails` into sub-tabbed component | `src/components/DesignDetails.jsx`, `src/components/design/*.jsx` | 5 sub-tabs. Collapsible entity cards. Cross-reference links. Works in light + dark. | L |
| 2.2 | Enrich `designDetails.js` with TL;DR, interview tips, tradeoffs | `src/data/designDetails.js` | Each module has `tldr`, `interviewTips`, `tradeoffs` arrays. Content is accurate to the code. | M |

---

#### **Sprint 3: Core 9 Module Migration** (depends on Sprints 1 + 2)

Each task: remove body/global overrides, replace hardcoded colors, migrate to LldPage wrapper, use shared components, use apiFetch, use usePolling.

| # | Module | Size | Module-Specific AC |
|---|--------|------|--------------------|
| 3.1 | Parking Lot | L | Animated demo responsive. SpotGrid uses tooltips. Gate animation uses spring easing. |
| 3.2 | Zomato | M | Order status stepper. Cart badge animation. Theme-aware Zomato-red accent. |
| 3.3 | Uber | M | Route visualization with markers. Vehicle card selection. Status stepper. |
| 3.4 | Stack Overflow | M | Vote column layout. Tag pills. Accept answer animation. |
| 3.5 | Tic Tac Toe | S | Win line animation. Turn indicator. Ghost hover. |
| 3.6 | Snake & Ladders | M | Visible snakes/ladders on board. Dice animation. Token movement. |
| 3.7 | ATM | M | Fix PIN double-submit. Fix balance mutation. Larger keypad. Card/cash animations. |
| 3.8 | Splitwise | M | Balance bars. Expense split visualization. Settle suggestions. |
| 3.9 | Elevator | L | Smooth floor transitions. Door animation. Unified sim/app style. Fix tick conflict. |

---

#### **Sprint 4: Remaining Module Batches** (depends on Sprint 3)

| # | Batch | Modules | Size |
|---|-------|---------|------|
| 4.1 | Batch 1: Games | Chess, Ludo, Minesweeper | M each |
| 4.2 | Batch 2: Real-world | CoffeeMachine, VendingMachine, DigitalWallet, Library, MovieTicket, Hotel, Airline, Inventory, ShoppingCart | S each |
| 4.3 | Batch 3: Platforms | LinkedIn, SocialNetwork, CricInfo, MusicStreaming, StockBrokerage, CarRental, Auction, Restaurant, ConcertTicket, CourseRegistration, LoggingFramework, TrafficSignal, TaskManagement, PubSub, LruCache | S each |
| 4.4 | Batch 4: Concurrency/DS | FooBar, ZeroEvenOdd, FizzBuzz, H2O, TtlCache, ConcurrentHashMap, BlockingQueue, BloomFilter, MergeSort | S each |

**Per-module AC for all batches**:
- [ ] No `body { }` or `* { }` rules in module CSS
- [ ] No hardcoded color values — all via CSS variables
- [ ] Uses `LldPage` wrapper
- [ ] Uses `apiFetch` in api.js
- [ ] Uses `usePolling` hook (if module polls)
- [ ] Uses shared `Button`, `Card`, `Badge`, etc. where applicable
- [ ] Loading states use `Skeleton`
- [ ] Errors use `Toast` or inline error with retry
- [ ] Empty states use `EmptyState`
- [ ] Works in both light and dark theme
- [ ] No visual regression in functionality

---

#### **Sprint 5: Polish** (depends on Sprint 4)

| # | Task | Files | AC | Size |
|---|------|-------|----|------|
| 5.1 | Page transition animations | `App.jsx` | Framer Motion `AnimatePresence` on route changes. Fade + slight slide. | S |
| 5.2 | Home page polish | `Home.jsx`, `Home.css` | Category filter tabs. Smooth card entrance animation. Search highlight matches. Progress indicator showing completion status per module. | M |
| 5.3 | Mobile responsiveness audit | All module CSS | No horizontal overflow on 375px width. Tabs scroll horizontally. Forms stack vertically. Tables horizontally scroll. | M |
| 5.4 | Accessibility audit | All components | All interactive elements focusable. Color contrast ≥ 4.5:1. Aria labels on icon-only buttons. Skip-to-content link. | M |
| 5.5 | Performance audit | Build output | `npm run build` produces < 500KB JS (gzip). No module loads > 50KB. Lazy-load module pages via `React.lazy`. | M |

---

## Appendix A: What NOT to Change

- **Backend Java code**: No refactoring of services, repositories, models, or controllers. Backend is interview-ready as-is.
- **API contracts**: No new endpoints, no changed request/response shapes. Frontend changes only.
- **Database**: No DB introduction. In-memory storage is a deliberate design choice.
- **Framework**: No migration to Next.js, Remix, or other frameworks. Vite + React Router stays.
- **Testing infrastructure**: No test framework changes. Existing Vitest tests should continue passing.

**Exception — Backend bugs that MUST be fixed**:
1. Elevator `@Scheduled` tick conflict (Phase 1.6) — either disable or guard
2. Any backend endpoint that returns 200 with an `error` field instead of proper HTTP status codes (makes `res.ok` checking unreliable) — should return 400/404 instead

## Appendix B: File Inventory

### Files to CREATE
```
frontend/src/utils/api.js
frontend/src/hooks/usePolling.js
frontend/src/components/ui/Button.jsx
frontend/src/components/ui/Button.css
frontend/src/components/ui/Card.jsx
frontend/src/components/ui/Card.css
frontend/src/components/ui/Badge.jsx
frontend/src/components/ui/Input.jsx
frontend/src/components/ui/Select.jsx
frontend/src/components/ui/Table.jsx
frontend/src/components/ui/Table.css
frontend/src/components/ui/Toast.jsx
frontend/src/components/ui/ToastContext.jsx
frontend/src/components/ui/Modal.jsx
frontend/src/components/ui/EmptyState.jsx
frontend/src/components/ui/Skeleton.jsx
frontend/src/components/ui/StepIndicator.jsx
frontend/src/components/LldPage.css
frontend/src/components/design/RequirementsTab.jsx
frontend/src/components/design/EntitiesTab.jsx
frontend/src/components/design/PatternsTab.jsx
frontend/src/components/design/PrinciplesTab.jsx
frontend/src/components/design/ExtensibilityTab.jsx
```

### Files to MODIFY
```
frontend/src/styles/theme.css           (token expansion)
frontend/index.html                     (Inter font link)
frontend/src/components/LldPage.jsx     (v2 refactor)
frontend/src/components/ClassDiagram.jsx (data-class fix)
frontend/src/components/DesignDetails.jsx (sub-tab refactor)
frontend/src/data/designDetails.js      (content enrichment)
frontend/src/App.jsx                    (page transitions)
frontend/src/pages/Home.jsx             (polish)
frontend/src/pages/Home.css             (polish)
frontend/src/lld/*/api.js               (apiFetch migration — 45 files)
frontend/src/lld/*/*.jsx                (all 45 module pages)
backend/.../elevator/service/ElevatorService.java (tick conflict fix)
```

### Files to DELETE
None — all changes are additive or in-place modifications.
