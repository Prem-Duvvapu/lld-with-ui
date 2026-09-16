import { clickWhenReady } from './waitForSelector';

/**
 * The module the tour walks through. Elevator earns it: it has all five tabs, its
 * operational view animates on real backend state, and its simulation is the clearest
 * demonstration of what this site does that a static repo can't.
 */
export const TOUR_MODULE = 'elevator';
export const TOUR_MODULE_PATH = '/elevator';

/**
 * Each step is { selector, title, body, prepare? }.
 *
 * `prepare(ctx)` runs before the step is shown and may navigate, switch tabs or reveal —
 * `ctx` is { navigate, reveal, isRevealed }. Steps drive the real tab buttons by clicking
 * them rather than reaching into component state: LldPage owns its tab in local state and
 * DesignDetails owns its sub-tab separately, so clicking is both simpler and exercises
 * exactly the path a visitor would take.
 *
 * On the reveal gate: the tour explains it, then unlocks this one module so the next step
 * shows a real class diagram. A tour whose "class diagram" step displays only a padlock
 * undersells the site — but silently bypassing the gate would waste the feature it just
 * finished explaining. So it does both, and says so.
 */
export const TOUR_STEPS = [
  {
    selector: null,
    title: '👋 Welcome to the LLD portfolio',
    body: "60 Low-Level Design problems, each with a live UI, a real Java backend and its class diagram. This tour walks you through the home page, then opens a module so you can see what's inside one. Esc or ✕ leaves at any point.",
    prepare: ({ navigate }) => navigate('/'),
  },
  {
    selector: '[data-tour="search"]',
    title: 'Search',
    body: 'Find a module by name, description or category.',
  },
  {
    selector: '[data-tour="difficulty"]',
    title: 'Filter by difficulty',
    body: 'Narrow to Easy, Medium or Hard — useful for pacing a prep session.',
  },
  {
    selector: '[data-tour="pattern"]',
    title: 'Filter by design pattern',
    body: 'Drilling Strategy or Observer today? Open ⚙️ Filters and pick a GoF pattern — the grid narrows to the modules that genuinely use it.',
    prepare: () => clickWhenReady('[data-tour="filters-toggle"]'),
  },
  {
    selector: '[data-tour="progress"]',
    title: 'Track what you have covered',
    body: "Mark a module reviewed with the checkmark on its card, flag one with 🔖 to come back to, and use the toggles in ⚙️ Filters to show only what's left. It's all saved in this browser, and exportable to a file.",
  },

  // ---- into a module -------------------------------------------------------
  {
    selector: '[data-tour="tab-app"]',
    title: "Now let's open one",
    body: "This is Elevator. The first tab is the working app — a real UI driving a real Java service, not a mockup. Every module has one.",
    prepare: async ({ navigate }) => {
      navigate(TOUR_MODULE_PATH);
      await clickWhenReady('[data-tour="tab-app"]');
    },
  },
  {
    selector: '[data-tour="tab-simulation"]',
    title: 'Interactive simulation',
    body: 'An eight-step walkthrough of the design running against an isolated sandbox, with live telemetry. This is where the concurrency modules earn their keep — you watch the race happen rather than read about it.',
    prepare: () => clickWhenReady('[data-tour="tab-simulation"]'),
  },
  {
    selector: '[data-tour="reveal-gate"]',
    title: 'Try it yourself first',
    body: "Open the Class Diagram and you get this, not the answer. Sketch your own entities in the box first — that attempt is the practice. Your notes are saved and stay on screen afterwards so you can compare.",
    prepare: () => clickWhenReady('[data-tour="tab-diagram"]'),
  },
  {
    selector: '[data-tour="tab-diagram"]',
    title: 'Class diagram',
    body: "We've unlocked this one module so you can see what's behind the gate: an interactive diagram — click any class to isolate its relationships, or switch to the list view. Every other module stays locked, and 🔒 Hide again re-locks this one.",
    prepare: ({ reveal }) => reveal(TOUR_MODULE),
  },
  {
    selector: '[data-tour="tab-sequence"]',
    title: 'Sequence diagram',
    body: 'The same design over time — which object calls which, in order, for the flows that matter. Several modules trace an actual /sim request end to end.',
    prepare: () => clickWhenReady('[data-tour="tab-sequence"]'),
  },
  {
    selector: '[data-tour="design-subtabs"]',
    title: 'Design details',
    body: 'The written rationale, in five sub-tabs: Requirements (always visible — it is the problem statement), then Entities, Design Patterns, SOLID & OOP, and Extensibility. The last four sit behind the same gate, which is why they show 🔒 until you reveal.',
    prepare: () => clickWhenReady('[data-tour="tab-design"]'),
  },
  {
    selector: '[data-tour="source-links"]',
    title: 'Read the actual code',
    body: 'Both links open this module\'s real source on GitHub — the Java service and the React page. Nothing here is a diagram of code that does not exist.',
  },
  {
    selector: null,
    title: "That's the tour",
    body: 'Pick a module and try it attempt-first — that is what the site is for. Replay this anytime from ☰ → "Take a tour" on the home page.',
  },
];
