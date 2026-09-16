// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LearningPath from '../pages/LearningPath';
import { ALL_LLDS, LEARNING_PHASES } from '../data/moduleCatalog';

beforeEach(() => {
  localStorage.clear();
});

function renderPath() {
  return render(
    <MemoryRouter>
      <LearningPath />
    </MemoryRouter>,
  );
}

describe('LearningPath page', () => {
  it('renders every phase name and every module exactly once', () => {
    renderPath();
    for (const phase of LEARNING_PHASES) {
      expect(screen.getByText(phase.name)).toBeDefined();
    }
    for (const item of ALL_LLDS) {
      expect(screen.getAllByText(item.title)).toHaveLength(1);
    }
  });

  it('lists modules within a phase in ascending step order', () => {
    const { container } = renderPath();
    const firstPhaseSteps = [...container.querySelectorAll('.learning-phase')][0]
      .querySelectorAll('.learning-path-step');
    const steps = [...firstPhaseSteps].map((el) => Number(el.textContent));
    const sorted = [...steps].sort((a, b) => a - b);
    expect(steps).toEqual(sorted);
  });

  it('links each row to its module route', () => {
    renderPath();
    const ticTacToe = ALL_LLDS.find((item) => item.title === 'Tic Tac Toe');
    const link = screen.getByText('Tic Tac Toe').closest('a');
    expect(link.getAttribute('href')).toBe('/tictactoe');
    expect(ticTacToe.order).toBe(1);
  });
});
