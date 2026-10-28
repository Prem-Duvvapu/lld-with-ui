// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LessonClassModel from '../learning/LessonClassModel';
import inheritance from '../learning/lessons/inheritance';
import interfaces from '../learning/lessons/interfaces';
import dependency from '../learning/lessons/dependency';
import association from '../learning/lessons/association';
import aggregation from '../learning/lessons/aggregation';
import composition from '../learning/lessons/composition';
import card from '../learning/lessons/classes-and-objects';

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

function choose(model, kind, from) {
  const index = model.relationships.findIndex(relationship => relationship.kind === kind && (!from || relationship.from === from));
  expect(index).toBeGreaterThanOrEqual(0);
  fireEvent.change(screen.getByRole('combobox', { name: 'Class model view' }), { target: { value: String(index) } });
  return model.relationships[index];
}

const cases = [
  ['Generalization', inheritance.classModel, false, null, 'triangle'],
  ['Realization', interfaces.classModel, true, null, 'triangle'],
  ['Dependency', dependency.classModel, true, null, 'arrow'],
  ['Association', association.classModel, false, null, null],
  ['Shared aggregation', aggregation.classModel, false, 'aggregation', null],
  ['Composition', composition.classModel, false, 'composition', null],
];

describe('Curated relationship connectors', () => {
  it.each(cases)('%s selects actual endpoint compartments with the correct connector ends', (kind, model, dashed, start, end) => {
    const { container } = render(<LessonClassModel model={model} />);
    const selector = screen.getByRole('combobox', { name: 'Class model view' });
    expect(selector).toHaveValue('all');
    expect(selector.closest('[aria-hidden="true"]')).toBeNull();
    expect(container.querySelectorAll('.lesson-class-model-type')).toHaveLength(model.classes.length);
    expect(container.querySelector('svg')).toBeNull();
    expect(within(selector).getAllByRole('option')).toHaveLength(model.relationships.length + 1);
    selector.focus();
    const relationship = choose(model, kind);
    const canvas = container.querySelector('.lesson-class-model-canvas');
    const boxes = [...canvas.querySelectorAll('.lesson-class-model-type')];
    expect(boxes.map(box => box.dataset.type)).toEqual([relationship.from, relationship.to]);
    for (const box of boxes) {
      const type = model.classes.find(type => type.name === box.dataset.type);
      [...type.fields, ...type.methods].forEach(member => expect(box).toHaveTextContent(member));
    }
    const svg = canvas.querySelector('svg');
    expect(svg).toHaveAttribute('data-kind', kind);
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 128 64');
    const line = svg.querySelector('.lesson-class-model-edge');
    expect(line.getAttribute('stroke-dasharray')).toBe(dashed ? '8 5' : null);
    for (const [attribute, marker] of [['marker-start', start], ['marker-end', end]]) {
      if (!marker) expect(line).not.toHaveAttribute(attribute);
      else {
        const markerId = line.getAttribute(attribute).slice(5, -1);
        expect(markerId).toMatch(new RegExp(`-${marker}$`));
        const definition = svg.querySelector(`[id="${markerId}"]`);
        expect(definition).not.toBeNull();
        expect(definition).toHaveAttribute('refX', start ? '0' : end === 'triangle' ? '20' : '17');
        const shape = definition.querySelector('path');
        if (marker === 'arrow') {
          expect(shape).toHaveAttribute('fill', 'none');
          expect(shape.getAttribute('d')).not.toContain('Z');
        } else if (marker === 'composition') expect(shape).toHaveAttribute('fill', 'currentColor');
        else expect(shape).toHaveClass('lesson-class-model-hollow');
      }
    }
    // Navigation is curated prose: even association's explicit forward navigation
    // must not turn its unadorned connector into an arrow.
    const selectedText = container.querySelector('.lesson-class-model-selection');
    expect(selectedText).toHaveTextContent(relationship.explanation);
    if (relationship.navigation) expect(selectedText).toHaveTextContent(relationship.navigation);
    if (relationship.multiplicity) expect(selectedText).toHaveTextContent(relationship.multiplicity);
    expect(canvas.querySelectorAll('button,a,input,select,summary,[tabindex]')).toHaveLength(0);
    expect(selector).toHaveFocus();
    fireEvent.change(selector, { target: { value: 'all' } });
    expect(canvas.querySelectorAll('.lesson-class-model-type')).toHaveLength(model.classes.length);
    expect(canvas.querySelector('svg')).toBeNull();
  });

  it('keeps the complete transcript when a pair omits other types and relationships', () => {
    const model = dependency.classModel;
    const { container } = render(<LessonClassModel model={model} />);
    choose(model, 'Dependency', 'QuoteService');
    const explanation = screen.getByText('Text explanation', { selector: 'summary' }).parentElement;
    explanation.open = true;
    for (const type of model.classes) {
      expect(within(explanation).getByRole('heading', { name: `${type.name} — ${type.kind}` })).toBeVisible();
      [...type.fields, ...type.methods].forEach(member => expect(explanation).toHaveTextContent(member));
    }
    for (const relationship of model.relationships) expect(explanation).toHaveTextContent(relationship.explanation);
    expect(container.querySelector('.lesson-class-model-selection')).toHaveTextContent('Dashed line with an open arrow');
    expect(screen.getByText(/Only listed declarations are shown; inherited members/)).toBeVisible();
  });

  it('falls back to All types when a different model has fewer or no relationships', () => {
    const view = render(<LessonClassModel model={dependency.classModel} />);
    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: '5' } });
    expect(selector).toHaveValue('5');
    view.rerender(<LessonClassModel model={composition.classModel} />);
    expect(screen.getByRole('combobox')).toHaveValue('all');
    expect(view.container.querySelector('svg')).toBeNull();
    expect(view.container.querySelectorAll('.lesson-class-model-type')).toHaveLength(2);
    choose(composition.classModel, 'Composition');
    view.rerender(<LessonClassModel model={card.classModel} />);
    expect(screen.getByRole('combobox')).toHaveValue('all');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(view.container.querySelector('svg')).toBeNull();
    expect(view.container.querySelector('[data-type="StudyCard"]')).not.toBeNull();
    view.rerender(<LessonClassModel model={composition.classModel} />);
    expect(screen.getByRole('combobox')).toHaveValue('all');
    expect(view.container.querySelector('svg')).toBeNull();
  });

  it('uses instance-unique marker IDs and local references, including after fullscreen', () => {
    const model = composition.classModel;
    const view = render(<><LessonClassModel model={model} /><LessonClassModel model={model} /></>);
    screen.getAllByRole('combobox').forEach(selector => fireEvent.change(selector, { target: { value: '0' } }));
    const ids = [...view.container.querySelectorAll('marker')].map(marker => marker.id);
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(ids.length);
    view.container.querySelectorAll('svg').forEach(svg => {
      const id = svg.querySelector('.lesson-class-model-edge').getAttribute('marker-start').slice(5, -1);
      expect(svg.querySelector(`[id="${id}"]`)).not.toBeNull();
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Fullscreen', exact: true })[0]);
    expect(screen.getByRole('dialog').querySelector('svg')).not.toBeNull();
    const fullscreenIds = [...document.querySelectorAll('marker')].map(marker => marker.id);
    expect(new Set(fullscreenIds).size).toBe(fullscreenIds.length);
    document.querySelectorAll('svg').forEach(svg => {
      const id = svg.querySelector('.lesson-class-model-edge').getAttribute('marker-start').slice(5, -1);
      expect(svg.querySelector(`[id="${id}"]`)).not.toBeNull();
    });
  });

  it('preserves selected endpoints through zoom, fit, fullscreen and Escape focus restoration', () => {
    const model = inheritance.classModel;
    const view = render(<LessonClassModel model={model} />);
    const selector = screen.getByRole('combobox');
    selector.focus();
    choose(model, 'Generalization');
    expect(selector).toHaveFocus();
    const viewport = screen.getByRole('region', { name: /scrollable diagram/ });
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 264 });
    fireEvent.click(screen.getByRole('button', { name: 'Fit width' }));
    expect(viewport.firstElementChild.style.width).toBe('264px');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('47%');
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveFocus();
    expect(screen.getByRole('dialog').querySelector('svg')).toHaveAttribute('data-kind', 'Generalization');
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.getByRole('button', { name: 'Fullscreen', exact: true })).toHaveFocus();
    expect(screen.getByRole('combobox')).toHaveValue('0');
    expect(view.container.querySelectorAll('.lesson-class-model-type')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');
  });
});
