const POLL_MS = 60;
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Resolve once `selector` exists in the DOM, or null if it never shows up.
 *
 * The tour now crosses routes, and a module page's tab buttons don't exist until
 * react-router has switched route AND the page's lazy chunk has downloaded AND the tab
 * has rendered. A single `querySelector` at step time — which is all the home-page-only
 * tour ever needed — finds nothing and the step silently degrades to a centred modal
 * with no spotlight. Polling is the honest fix: the element genuinely isn't there yet.
 *
 * Resolves with null rather than rejecting, so a step whose target never appears still
 * shows its text instead of breaking the tour.
 */
export function waitForSelector(selector, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const immediate = document.querySelector(selector);
    if (immediate) {
      resolve(immediate);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
      } else if (Date.now() - startedAt > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, POLL_MS);
  });
}

/** Wait for a control to exist, then click it — how the tour drives real tab state. */
export async function clickWhenReady(selector, timeoutMs) {
  const el = await waitForSelector(selector, timeoutMs);
  el?.click();
  return el;
}
