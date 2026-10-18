// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import SolutionGate from '../components/SolutionGate';
import DesignDetails from '../components/DesignDetails';

beforeEach(() => localStorage.clear());

describe('Learning solution disclosure', () => {
  it('keeps focus at the solution region when revealing or hiding a diagram', () => {
    render(<SolutionGate module="focus-test" label="class diagram"><button>Inspect diagram</button></SolutionGate>);
    fireEvent.click(screen.getByRole('button', { name: /Reveal Solution/ }));
    expect(screen.getByRole('region', { name: 'class diagram solution' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Hide again/ }));
    expect(screen.getByRole('region', { name: 'class diagram solution' })).toHaveFocus();
    expect(screen.getByRole('button', { name: /Reveal Solution/ })).toBeInTheDocument();
  });

  it('announces the selected design section and restores focus to it on disclosure', () => {
    const data = { title: 'Example', requirements: [], entities: [], designPatterns: [], principles: [], oopConcepts: [], extensibility: [] };
    render(<DesignDetails module="focus-test" customData={data} />);
    const entities = screen.getByRole('button', { name: /Entities/ });
    fireEvent.click(entities);
    expect(entities).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Reveal Solution/ }));
    expect(entities).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Hide again/ }));
    expect(entities).toHaveFocus();
  });
});
