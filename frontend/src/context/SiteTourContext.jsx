import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import WebsiteTour from '../components/WebsiteTour';
import { TOUR_STEPS } from '../components/tour/tourSteps';
import { useTour } from '../hooks/useTour';

const SiteTourContext = createContext({ startTour: () => {} });

export function useSiteTour() {
  return useContext(SiteTourContext);
}

/**
 * Owns the site tour above the router.
 *
 * It used to live inside Home, which was fine while every step pointed at something on
 * the home page — but the tour now walks into a module and through its tabs, and a tour
 * mounted inside a route unmounts the moment it navigates. Hoisting it here lets it cross
 * routes; Home just calls `startTour()`.
 */
export function SiteTourProvider({ children }) {
  const [open, setOpen] = useState(false);
  const { hasSeenTour, markSeen } = useTour();
  const location = useLocation();

  // Auto-open only on the home route. The welcome step's own `prepare` navigates to
  // "/" unconditionally (it's a tour of the whole site, starting from the top) — if a
  // first-time visitor's very first request is a direct link to a module page, firing
  // the tour here would yank them back to Home before they see what they came for.
  // They can still start it manually from Home's ☰ menu.
  useEffect(() => {
    if (hasSeenTour || location.pathname !== '/') return undefined;
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [hasSeenTour, location.pathname]);

  const startTour = useCallback(() => setOpen(true), []);

  const finish = useCallback(() => {
    setOpen(false);
    markSeen();
  }, [markSeen]);

  const value = useMemo(() => ({ startTour }), [startTour]);

  return (
    <SiteTourContext.Provider value={value}>
      {children}
      {open && <WebsiteTour steps={TOUR_STEPS} onFinish={finish} />}
    </SiteTourContext.Provider>
  );
}
