// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import Home from '../pages/Home';
import { SiteTourProvider } from '../context/SiteTourContext';

/**
 * The action buttons, progress breakdown and secondary filters used to sit fully expanded
 * on first paint -- four buttons, six category bars, a pattern dropdown and three checkboxes
 * before a single module card. On a phone that's a full screen of controls before any content.
 * These now collapse behind a hamburger menu, a progress toggle and a Filters toggle, all
 * closed by default, so this guards that the collapse actually happens and that opening each
 * one still reaches the real control underneath (not just visually, since the tour drives
 * these same elements by selector).
 */
function renderHome() {
  return render(
    <MemoryRouter>
      <SiteTourProvider>
        <Home />
      </SiteTourProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Home page — collapsed-by-default controls', () => {
  it('hides the action menu, category breakdown and pattern/checkbox filters on first paint', () => {
    const { container } = renderHome();
    expect(screen.queryByText('🎲 Surprise me')).toBeNull();
    expect(container.querySelector('.category-breakdown')).toBeNull();
    expect(screen.queryByLabelText('Filter by design pattern')).toBeNull();
    expect(screen.queryByText("Show only what's left to review")).toBeNull();
  });

  it('opens the action menu on the hamburger button and closes on an outside click', () => {
    renderHome();
    fireEvent.click(screen.getByLabelText('More actions'));
    expect(screen.getByText('🎲 Surprise me')).toBeDefined();
    expect(screen.getByText('🧭 Take a tour')).toBeDefined();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('🎲 Surprise me')).toBeNull();
  });

  it('expands the category breakdown on the progress toggle', () => {
    const { container } = renderHome();
    fireEvent.click(screen.getByText(/reviewed/));
    const breakdown = container.querySelector('.category-breakdown');
    expect(breakdown).not.toBeNull();
    expect(breakdown.textContent).toContain('Concurrency');
  });

  it('reveals the pattern select and checkboxes behind the Filters toggle', () => {
    renderHome();
    const toggle = screen.getByText(/⚙️ Filters/);
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Filter by design pattern')).toBeDefined();
    expect(screen.getByText("Show only what's left to review")).toBeDefined();
    expect(screen.getByText('📚 Suggested learning order')).toBeDefined();
  });

  it('shows an active-filter count on the Filters toggle without opening the panel', () => {
    renderHome();
    fireEvent.click(screen.getByText(/⚙️ Filters/));
    fireEvent.click(screen.getByText("Show only what's left to review"));
    fireEvent.click(screen.getByText(/⚙️ Filters/)); // collapse again

    expect(screen.getByText('⚙️ Filters (1)')).toBeDefined();
  });
});
