// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import DiagramViewer from '../components/DiagramViewer';
import ClassDiagram from '../components/ClassDiagram';
import SequenceDiagram from '../components/SequenceDiagram';
import LessonClassModel from '../learning/LessonClassModel';

const lessons = Object.values(import.meta.glob('../learning/lessons/*.js', { eager: true }))
  .map(module => module.default).filter(lesson => lesson.classModel);

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});

afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('Diagram viewer heading context', () => {
  it.each([1, 2, 3, 4, 5, 6])('renders a native h%i when requested', headingLevel => {
    render(<DiagramViewer title="Example" headingLevel={headingLevel} width={720}><p>Diagram</p></DiagramViewer>);
    expect(screen.getByRole('heading', { name: 'Example viewer', level: headingLevel }).tagName).toBe(`H${headingLevel}`);
  });

  it.each([0, 7, 2.5, null, 'h3'])('falls back to h4 for unsupported heading level %s', headingLevel => {
    render(<DiagramViewer title="Example" headingLevel={headingLevel} width={720}><p>Diagram</p></DiagramViewer>);
    expect(screen.getByRole('heading', { name: 'Example viewer', level: 4 }).tagName).toBe('H4');
  });

  it.each([
    ['class', ClassDiagram, { title: 'Module classes', classes: [], relationships: [] }],
    ['sequence', SequenceDiagram, { title: 'Module sequence', flows: [{ id: 'empty', participants: [], steps: [] }] }],
  ])('preserves the module %s diagram h3 → h4 hierarchy by default', (_kind, Component, data) => {
    render(<Component module="example" customData={data} />);
    const headings = screen.getAllByRole('heading');
    expect(headings[0]).toHaveTextContent(data.title);
    expect(headings[0].tagName).toBe('H3');
    expect(headings[1]).toHaveTextContent(/viewer$/);
    expect(headings[1].tagName).toBe('H4');
  });

  it.each(lessons.map(lesson => [lesson.id, lesson.classModel]))('%s follows its model h2 immediately with a viewer h3', (_id, model) => {
    render(<LessonClassModel model={model} />);
    const section = screen.getByRole('region', { name: model.title, exact: true });
    const viewer = within(section).getByRole('region', { name: `${model.title} viewer`, exact: true });
    const headings = within(section).getAllByRole('heading');
    expect(headings[0]).toBe(screen.getByRole('heading', { name: model.title, level: 2 }));
    expect(headings[1]).toBe(within(viewer).getByRole('heading', { name: `${model.title} viewer`, level: 3 }));
    expect(headings[1].tagName).toBe('H3');
    expect(headings[1]).toHaveStyle({ margin: '0px', fontSize: '14px', overflowWrap: 'anywhere' });

    const explanation = within(viewer).getByText('Text explanation', { selector: 'summary' }).parentElement;
    explanation.open = true;
    const detailHeadings = within(explanation).getAllByRole('heading');
    expect(detailHeadings.length).toBeGreaterThan(0);
    expect(detailHeadings.every(heading => heading.tagName === 'H4')).toBe(true);
  });

  it('keeps the chosen heading as the native dialog name through zoom, fullscreen and cancel', () => {
    const model = lessons.find(lesson => lesson.id === 'composition').classModel;
    const name = `${model.title} viewer`;
    render(<LessonClassModel model={model} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
    const titleId = screen.getByRole('heading', { name, level: 3 }).id;
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
    const dialog = screen.getByRole('dialog', { name });
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute('aria-labelledby', titleId);
    expect(within(dialog).getByRole('heading', { name, level: 3 })).toHaveAttribute('id', titleId);
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveFocus();
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('110%');
    expect(document.querySelectorAll('.lesson-class-model-connector')).toHaveLength(1);
    const markerIds = [...document.querySelectorAll('marker')].map(marker => marker.id);
    expect(new Set(markerIds).size).toBe(markerIds.length);

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name, exact: true })).toHaveAttribute('aria-labelledby', titleId);
    expect(screen.getByRole('heading', { name, level: 3 })).toHaveAttribute('id', titleId);
    expect(screen.getByRole('button', { name: 'Fullscreen', exact: true })).toHaveFocus();
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('110%');
  });
});
