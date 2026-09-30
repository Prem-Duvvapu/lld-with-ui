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

describe('Home page — module discovery', () => {
  it('filters by category and difficulty together, then resets all filters', () => {
    const { container } = renderHome();
    fireEvent.click(screen.getByRole('button', { name: /^Games / }));
    fireEvent.click(screen.getByRole('button', { name: 'Easy' }));
    const cards = [...container.querySelectorAll('.lld-card')];
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach(card => {
      expect(card.textContent).toContain('Games');
      expect(card.textContent).toContain('Easy');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(container.querySelectorAll('.lld-card')).toHaveLength(60);
    expect(screen.getByRole('button', { name: 'All Levels' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('trims search, supports route aliases, and offers recovery for empty results', () => {
    const { container } = renderHome();
    const search = screen.getByRole('textbox', { name: 'Search modules' });
    fireEvent.change(search, { target: { value: '  UBER  ' } });
    expect(container.querySelectorAll('.lld-card')).toHaveLength(1);
    expect(container.querySelector('.lld-card').textContent).toContain('Cab Booking');
    fireEvent.change(search, { target: { value: 'no-such-module' } });
    expect(screen.getByText('No modules match just yet.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Show all modules' }));
    expect(container.querySelectorAll('.lld-card')).toHaveLength(60);
  });

  it('keeps progress actions outside links and advances the suggested next module', () => {
    const { container } = renderHome();
    expect(container.querySelector('a button')).toBeNull();
    const start = screen.getByRole('link', { name: /Start here/ });
    const initialPath = start.getAttribute('href');
    const card = [...container.querySelectorAll('.lld-card')]
      .find(item => item.querySelector('a').getAttribute('href') === initialPath);
    fireEvent.click(card.querySelector('.review-toggle'));
    expect(screen.getByRole('link', { name: /Keep learning/ }).getAttribute('href')).not.toBe(initialPath);
    expect(card.querySelector('.review-toggle').getAttribute('aria-pressed')).toBe('true');
  });

  it('only intercepts arrow navigation when a module link has focus', () => {
    const { container } = renderHome();
    const category = screen.getByRole('button', { name: /^Games / });
    category.focus();
    fireEvent.keyDown(category, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(category);
    const links = container.querySelectorAll('.lld-card h2 a');
    links[0].focus();
    fireEvent.keyDown(links[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(links[1]);
    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search modules' }));
  });
});
