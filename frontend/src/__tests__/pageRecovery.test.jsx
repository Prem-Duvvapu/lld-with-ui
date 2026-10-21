// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { lazy, Suspense } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageErrorBoundary from '../components/PageErrorBoundary';

function BrokenPage() {
  throw new Error('Fixture render failure');
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Route recovery boundary', () => {
  it('shows actionable, keyboard-focused recovery without clearing saved learning', () => {
    localStorage.setItem('lld-lessons-v1', 'saved lesson notes');
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    render(<PageErrorBoundary><BrokenPage /></PageErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'This page could not be opened' })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Unsaved changes may be lost');
    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lld-lessons-v1')).toBe('saved lesson notes');
    expect(screen.getByRole('link', { name: 'Return to module library' })).toHaveAttribute('href', '/');
  });

  it('catches a failed lazy import as well as a render failure', async () => {
    const FailedChunk = lazy(() => Promise.reject(new Error('Chunk unavailable')));
    render(<PageErrorBoundary><Suspense fallback={<p>Loading fixture</p>}><FailedChunk /></Suspense></PageErrorBoundary>);
    expect(await screen.findByRole('heading', { name: 'This page could not be opened' })).toBeInTheDocument();
  });

  it('does not carry a previous route failure to the next route key', () => {
    const view = render(<PageErrorBoundary key="/broken"><BrokenPage /></PageErrorBoundary>);
    view.rerender(<PageErrorBoundary key="/working"><h1>Working route</h1></PageErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Working route' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
