// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import LessonDiagram from '../learning/LessonDiagram';
import UseCaseDiagram from '../learning/diagrams/UseCaseDiagram';
import { validateUseCaseModel } from '../learning/diagrams/useCaseModel';
import { findLesson } from '../learning/curriculum';
import existingLesson from '../learning/lessons/classes-and-objects';

// Independent authored requirements fixture; coordinates do not execute Java.
const model = {
  kind: 'use-case', title: 'Library goals', summary: 'Roles and goals for lending.', width: 900, height: 640,
  boundary: { label: 'Lending software', description: 'Physical handling is outside the subject.', x: 220, y: 30, width: 650, height: 580 },
  actors: [
    { id: 'member', label: 'Member', description: 'A registered borrower role.', x: 100, y: 160 },
    { id: 'staff', label: 'Staff', description: 'Staff retain member capabilities.', x: 100, y: 470 },
  ],
  useCases: [
    { id: 'borrow', label: 'Borrow', description: 'Obtain a complete loan without a receipt.', x: 410, y: 150, rx: 115, ry: 40, extensionPoints: ['confirmed'] },
    { id: 'eligibility', label: 'Eligibility', description: 'Check active membership.', x: 715, y: 250, rx: 115, ry: 40 },
    { id: 'receipt', label: 'Receipt', description: 'Optional receipt text.', x: 715, y: 100, rx: 115, ry: 40 },
  ],
  relationships: [
    { id: 'participation', kind: 'association', from: 'member', to: 'borrow', points: [[122, 152], [295, 150]], description: 'Members participate in borrowing.' },
    { id: 'required', kind: 'include', from: 'borrow', to: 'eligibility', points: [[500, 175], [630, 220]], description: 'Borrowing incorporates eligibility checking.' },
    { id: 'optional', kind: 'extend', from: 'receipt', to: 'borrow', points: [[600, 100], [525, 150]], description: 'A requested receipt extends a complete loan.', condition: 'A receipt was requested', extensionPoint: 'confirmed' },
    { id: 'specialization', kind: 'generalization', from: 'staff', to: 'member', points: [[78, 462], [40, 462], [40, 152], [78, 152]], description: 'Staff inherit the role capabilities under the stated policy.' },
  ],
  notes: ['Connecting lines do not impose a time order.'],
};
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('Use case diagram surface', () => {
  it('keeps every actor, goal and the complete text alternative while isolating relationships', () => {
    const { container } = render(<UseCaseDiagram model={model} />);
    expect(screen.getByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: `${model.title} viewer`, level: 3 })).toBeVisible();
    const selector = screen.getByRole('combobox', { name: 'Use case relationship' });
    expect(within(selector).getAllByRole('option')).toHaveLength(5);
    const explanation = screen.getByText('Text explanation', { selector: 'summary' }).parentElement;
    explanation.open = true;
    for (const edge of model.relationships) {
      fireEvent.change(selector, { target: { value: edge.id } });
      expect(container.querySelectorAll('[data-node]')).toHaveLength(5);
      expect(container.querySelectorAll('.use-case-boundary')).toHaveLength(1);
      const line = container.querySelector('.use-case-relationship');
      expect(line.parentElement).toHaveAttribute('data-from', edge.from);
      expect(line.parentElement).toHaveAttribute('data-to', edge.to);
      expect(container.querySelectorAll('[data-relationship]')).toHaveLength(1);
      expect(line.getAttribute('stroke-dasharray')).toBe(['include', 'extend'].includes(edge.kind) ? '8 5' : null);
      const marker = line.getAttribute('marker-end');
      if (edge.kind === 'association') expect(marker).toBeNull();
      else {
        expect(marker).toMatch(new RegExp(`-${edge.kind === 'generalization' ? 'triangle' : 'arrow'}\\)$`));
        expect(container.querySelector(`[id="${marker.slice(5, -1)}"]`)).not.toBeNull();
      }
      for (const node of [...model.actors, ...model.useCases]) expect(explanation).toHaveTextContent(node.description);
      for (const relationship of model.relationships) expect(explanation).toHaveTextContent(relationship.description);
      expect(explanation).toHaveTextContent(model.relationships[2].condition);
      expect(explanation).toHaveTextContent('Base extension point: confirmed');
      expect(explanation).toHaveTextContent(model.notes[0]);
    }
    fireEvent.change(selector, { target: { value: 'all' } });
    expect(container.querySelectorAll('[data-relationship]')).toHaveLength(4);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false');
    expect(container.querySelectorAll('svg :is(a,button,[tabindex])')).toHaveLength(0);
  });
  it('restores focus after fullscreen and keeps marker IDs local and unique across viewers', () => {
    const { container } = render(<><UseCaseDiagram model={model} /><UseCaseDiagram model={model} /></>);
    const ids = [...container.querySelectorAll('marker')].map(marker => marker.id);
    expect(ids).toHaveLength(8); expect(new Set(ids).size).toBe(8);
    for (const svg of container.querySelectorAll('svg')) for (const line of svg.querySelectorAll('[marker-end]')) {
      expect(svg.querySelector(`[id="${line.getAttribute('marker-end').slice(5, -1)}"]`)).not.toBeNull();
    }
    fireEvent.click(screen.getAllByRole('button', { name: 'Fullscreen', exact: true })[0]);
    const dialog = screen.getByRole('dialog', { name: `${model.title} viewer` });
    expect(dialog).toHaveAttribute('open'); expect(document.body.style.overflow).toBe('hidden');
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Fullscreen', exact: true })[0]).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
  it('resets selection when another model replaces it, including a return to the original', () => {
    const { container, rerender } = render(<UseCaseDiagram model={model} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'optional' } });
    rerender(<UseCaseDiagram model={{ ...model, title: 'Other model', relationships: [] }} />);
    expect(screen.getByRole('combobox')).toHaveValue('all');
    expect(container.querySelectorAll('[data-relationship]')).toHaveLength(0);
    rerender(<UseCaseDiagram model={model} />);
    expect(screen.getByRole('combobox')).toHaveValue('all');
    expect(container.querySelectorAll('[data-relationship]')).toHaveLength(4);
  });
  it('adds a lazy optional section while preserving existing lesson navigation', async () => {
    const metadata = findLesson(existingLesson.id);
    const { rerender } = render(<MemoryRouter><LessonContent lesson={existingLesson} metadata={metadata} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Use case diagram', exact: true })).not.toBeInTheDocument();
    rerender(<MemoryRouter><LessonContent lesson={{ ...existingLesson, diagram: model }} metadata={metadata} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Use case diagram', exact: true })).toHaveAttribute('href', '#lesson-diagram');
    expect(await screen.findByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    const links = within(screen.getByRole('navigation', { name: 'On this lesson' })).getAllByRole('link');
    expect(links.slice(0, 3).map(link => link.textContent)).toEqual(['Understand', 'Use case diagram', 'Visualize']);
  });
  it.each(['unsupported', 'toString', 'constructor'])('rejects unsupported kind %s', kind => {
    expect(() => LessonDiagram({ model: { kind } })).toThrow('not supported');
  });
});
describe('Authored use case model consistency', () => {
  it('accepts all four notation kinds and explicit role identity', () => {
    const nodes = validateUseCaseModel(model);
    expect(nodes.get('member').type).toBe('actor'); expect(nodes.get('borrow').type).toBe('case');
  });
  it.each([
    ['undeclared endpoint', m => { m.relationships[0].to = 'missing'; }],
    ['duplicate node', m => { m.actors[1].id = 'member'; }],
    ['actor inside subject', m => { m.actors[0].x = 300; }],
    ['ellipse outside subject', m => { m.useCases[0].x = 230; }],
    ['invalid path', m => { m.relationships[0].points[0][0] = Infinity; }],
    ['missing extension condition', m => { delete m.relationships[2].condition; }],
    ['extension point absent on base', m => { m.useCases[0].extensionPoints = []; }],
    ['include connected to actor', m => { m.relationships[1].to = 'member'; }],
    ['generalization across node kinds', m => { m.relationships[3].to = 'borrow'; }],
    ['participation between cases', m => { m.relationships[0].from = 'eligibility'; }],
  ])('rejects %s before painting a misleading diagram', (_name, mutate) => {
    const invalid = structuredClone(model); mutate(invalid);
    expect(() => validateUseCaseModel(invalid)).toThrow('Invalid use case diagram');
  });
});
