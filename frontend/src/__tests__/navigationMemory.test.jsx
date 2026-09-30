// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readMemory, writeMemory, recentPaths, rememberModule } from '../utils/navigationMemory';
import LldPage from '../components/LldPage';

vi.mock('../components/GithubSourceLinks', () => ({ default: () => null }));

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('Navigation memory', () => {
  it('deduplicates visits and keeps only the latest five', () => {
    ['one', 'two', 'three', 'four', 'five', 'six', 'two'].forEach(rememberModule);
    expect(recentPaths()).toEqual(['two', 'six', 'five', 'four', 'three']);
  });

  it('tolerates corrupt and unavailable storage', () => {
    localStorage.setItem('lld-recent-modules', 'broken json');
    expect(recentPaths()).toEqual([]);
    localStorage.setItem('lld-recent-modules', '{}');
    expect(recentPaths()).toEqual([]);
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readMemory('key', 'fallback')).toBe('fallback');
    expect(() => writeMemory('key', 'value')).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});

function renderTabs() {
  return render(<MemoryRouter><LldPage module="navigation-test" title="Test module" tabs={['entry', 'exit', 'history']}>
    {tab => <p>Content for {tab}</p>}
  </LldPage></MemoryRouter>);
}

describe('Module tab navigation', () => {
  it('still renders when session storage is blocked', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Entry' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Exit' }));
    expect(screen.getByText('Content for exit')).toBeDefined();
    get.mockRestore();
    set.mockRestore();
  });

  it('scrolls the tab strip horizontally to reveal the selection', () => {
    renderTabs();
    const nav = screen.getByRole('tablist');
    const history = screen.getByRole('tab', { name: 'Trip History' });
    vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 200 });
    vi.spyOn(history, 'getBoundingClientRect').mockReturnValue({ left: 220, right: 340 });
    fireEvent.click(history);
    expect(nav.scrollLeft).toBe(140);
  });
  it('supports roving focus, wrapping arrow keys, Home and End', () => {
    renderTabs();
    const entry = screen.getByRole('tab', { name: 'Entry' });
    entry.focus();
    fireEvent.keyDown(entry, { key: 'ArrowLeft' });
    const history = screen.getByRole('tab', { name: 'Trip History' });
    expect(document.activeElement).toBe(history);
    expect(history.tabIndex).toBe(0);
    expect(entry.tabIndex).toBe(-1);
    fireEvent.keyDown(history, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(entry);
    fireEvent.keyDown(entry, { key: 'End' });
    expect(document.activeElement).toBe(history);
    fireEvent.keyDown(history, { key: 'Home' });
    expect(document.activeElement).toBe(entry);
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(entry.id);
    expect(entry.getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel').id);
  });

  it('restores the previous tab and provides an explicit library link', () => {
    sessionStorage.setItem('lld-tab-navigation-test', 'exit');
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Exit' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('link', { name: '← Module library' }).getAttribute('href')).toBe('/');
    fireEvent.click(screen.getByRole('tab', { name: 'Entry' }));
    expect(sessionStorage.getItem('lld-tab-navigation-test')).toBe('entry');
  });
});
