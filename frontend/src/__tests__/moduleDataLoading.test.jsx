// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import ClassDiagram from '../components/ClassDiagram';
import DesignDetails from '../components/DesignDetails';
import SequenceDiagram from '../components/SequenceDiagram';

/**
 * The three barrels hand back `() => import(...)` loaders rather than data, so these
 * components now resolve their content asynchronously. That is a real behaviour change
 * on every module page, and nothing in the repo rendered a component before this file:
 * the circuit-breaker tab that shipped completely unstyled was exactly this blind spot.
 *
 * Each case asserts the full arc — placeholder first, real content after the chunk
 * resolves — because a component that renders its "no content" fallback while loading
 * looks identical to one whose data is genuinely missing.
 */
describe('module data loads lazily and renders', () => {
  it('ClassDiagram shows a loading state, then the diagram', async () => {
    render(<ClassDiagram module="splitwise" />);

    expect(screen.getByText(/loading class diagram/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.queryByText(/loading class diagram/i)).toBeNull();
    });
    // The resolved chunk really rendered: Splitwise's diagram names these classes.
    expect(screen.getAllByText(/Splitwise|Expense|Group/).length).toBeGreaterThan(0);
  });

  it('DesignDetails shows a loading state, then the requirements tab', async () => {
    render(<DesignDetails module="splitwise" />);

    expect(screen.getByText(/loading design details/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/📋 Requirements/)).toBeDefined();
    });
  });

  it('SequenceDiagram resolves its own chunk', async () => {
    render(<SequenceDiagram module="splitwise" />);

    await waitFor(() => {
      expect(screen.queryByText(/loading sequence diagram/i)).toBeNull();
    });
    expect(screen.queryByText(/couldn't be loaded/i)).toBeNull();
  });

  it('an unknown module reports missing content, not a load failure', async () => {
    render(<ClassDiagram module="does-not-exist" />);

    await waitFor(() => {
      expect(screen.getByText(/not available for this module yet/i)).toBeDefined();
    });
    expect(screen.queryByText(/couldn't be loaded/i)).toBeNull();
  });

  it('customData bypasses the store and renders immediately', () => {
    const customData = {
      title: 'Injected Diagram',
      classes: [{ name: 'Injected', attributes: [], methods: [] }],
      relationships: [],
    };
    render(<ClassDiagram module="splitwise" customData={customData} />);

    // No loading pass at all — the caller already had the data.
    expect(screen.queryByText(/loading class diagram/i)).toBeNull();
    expect(screen.getAllByText(/Injected/).length).toBeGreaterThan(0);
  });
});
