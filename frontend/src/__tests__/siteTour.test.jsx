// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

import WebsiteTour from '../components/WebsiteTour';
import { TOUR_STEPS, TOUR_MODULE } from '../components/tour/tourSteps';
import { waitForSelector, clickWhenReady } from '../components/tour/waitForSelector';
import { useReveal } from '../hooks/useReveal';
import { renderHook } from '@testing-library/react';
import { SiteTourProvider } from '../context/SiteTourContext';

beforeEach(() => {
  localStorage.clear();
});

describe('waitForSelector', () => {
  it('resolves an element that only appears later', async () => {
    const pending = waitForSelector('[data-tour="late"]');

    setTimeout(() => {
      const el = document.createElement('div');
      el.setAttribute('data-tour', 'late');
      document.body.appendChild(el);
    }, 120);

    const found = await pending;
    expect(found).not.toBeNull();
    found.remove();
  });

  it('resolves null instead of hanging when the target never appears', async () => {
    const found = await waitForSelector('[data-tour="never"]', 150);
    expect(found).toBeNull();
  });

  it('clickWhenReady clicks the control once it exists', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-tour', 'clickable');
    const onClick = vi.fn();
    btn.addEventListener('click', onClick);
    document.body.appendChild(btn);

    await clickWhenReady('[data-tour="clickable"]');
    expect(onClick).toHaveBeenCalledOnce();
    btn.remove();
  });
});

describe('tour step definitions', () => {
  it('every step has a title and body', () => {
    for (const step of TOUR_STEPS) {
      expect(typeof step.title, `step "${step.title}" needs a title`).toBe('string');
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
  });

  // The dots are keyed by title, so a duplicate would collide in React's reconciler.
  it('step titles are unique', () => {
    const titles = TOUR_STEPS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('covers the module tabs the tour exists to show', () => {
    const selectors = TOUR_STEPS.map((s) => s.selector).join(' ');
    for (const anchor of [
      'tab-app',
      'tab-simulation',
      'tab-diagram',
      'tab-sequence',
      'design-subtabs',
      'reveal-gate',
      'source-links',
    ]) {
      expect(selectors, `no step targets ${anchor}`).toContain(anchor);
    }
  });
});

/** Minimal stand-in for a module page: the anchors the tour drives, nothing else. */
function FakeModulePage() {
  return (
    <div>
      <span data-tour="source-links">source</span>
      <nav>
        {['app', 'simulation', 'diagram', 'sequence', 'design'].map((id) => (
          <button key={id} data-tour={`tab-${id}`} type="button">{id}</button>
        ))}
      </nav>
      <div data-tour="reveal-gate">gate</div>
      <nav data-tour="design-subtabs">subtabs</nav>
    </div>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
}

function TourHarness({ steps, onFinish = () => {} }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<div data-tour="search">home</div>} />
        <Route path={`/${TOUR_MODULE}`} element={<FakeModulePage />} />
      </Routes>
      <WebsiteTour steps={steps} onFinish={onFinish} />
    </MemoryRouter>
  );
}

describe('WebsiteTour across routes', () => {
  it('runs a step prepare that navigates, and lands on the module route', async () => {
    const steps = [
      { selector: '[data-tour="search"]', title: 'Home', body: 'home step' },
      {
        selector: '[data-tour="tab-simulation"]',
        title: 'Simulation',
        body: 'module step',
        prepare: async ({ navigate }) => {
          navigate(`/${TOUR_MODULE}`);
          await clickWhenReady('[data-tour="tab-simulation"]');
        },
      },
    ];

    render(<TourHarness steps={steps} />);
    expect(screen.getByTestId('path').textContent).toBe('/');

    fireEvent.click(screen.getByText('Next'));

    // The whole point of hoisting the tour out of Home: it survives the navigation.
    await waitFor(() => {
      expect(screen.getByTestId('path').textContent).toBe(`/${TOUR_MODULE}`);
    });
    expect(screen.getByText('module step')).toBeDefined();
  });

  it('a step whose target never appears still shows its text', async () => {
    const steps = [
      { selector: '[data-tour="does-not-exist"]', title: 'Orphan', body: 'still readable' },
    ];
    render(<TourHarness steps={steps} />);
    expect(screen.getByText('still readable')).toBeDefined();
  });

  it('prepare can reveal, and the reveal survives the tour closing', async () => {
    const steps = [
      { selector: null, title: 'Start', body: 'first' },
      {
        selector: null,
        title: 'Unlocked',
        body: 'second',
        prepare: ({ reveal }) => reveal(TOUR_MODULE),
      },
    ];

    render(<TourHarness steps={steps} />);
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => expect(screen.getByText('second')).toBeDefined());
    expect(renderHook(() => useReveal()).result.current.isRevealed(TOUR_MODULE)).toBe(true);
    // Only the toured module is unlocked — the gate stays up everywhere else.
    expect(renderHook(() => useReveal()).result.current.isRevealed('splitwise')).toBe(false);
  });

  it('Back returns to the previous step and Done finishes', async () => {
    const onFinish = vi.fn();
    const steps = [
      { selector: null, title: 'One', body: 'first' },
      { selector: null, title: 'Two', body: 'second' },
    ];

    render(<TourHarness steps={steps} onFinish={onFinish} />);
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByText('second')).toBeDefined());

    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByText('first')).toBeDefined());

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByText('Done')).toBeDefined());
    fireEvent.click(screen.getByText('Done'));
    expect(onFinish).toHaveBeenCalled();
  });
});

describe('SiteTourProvider — auto-open on first visit', () => {
  it('does not auto-open (and so cannot navigate away) when a first-time visitor lands directly on a module route', async () => {
    // The welcome step's own `prepare` unconditionally navigates to "/" -- if the
    // provider auto-opened here too, a first-time visitor's direct/shared link to any
    // module page would get yanked back to Home before they saw what they came for.
    render(
      <MemoryRouter initialEntries={['/elevator']}>
        <LocationProbe />
        <Routes>
          <Route path="/elevator" element={<div>elevator page</div>} />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
        <SiteTourProvider>
          <span />
        </SiteTourProvider>
      </MemoryRouter>,
    );

    // Give the provider's 500ms auto-open timer a chance to fire if it were going to.
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(screen.getByTestId('path').textContent).toBe('/elevator');
    expect(screen.queryByText('👋 Welcome to the LLD portfolio')).toBeNull();
  });

  it('still auto-opens for a first-time visitor who lands on the home route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<div>home page</div>} />
        </Routes>
        <SiteTourProvider>
          <span />
        </SiteTourProvider>
      </MemoryRouter>,
    );

    await waitFor(
      () => expect(screen.getByText('👋 Welcome to the LLD portfolio')).toBeDefined(),
      { timeout: 2000 },
    );
  });
});
