// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LessonClassModel from '../learning/LessonClassModel';
import LessonContent from '../learning/LessonContent';
import { LESSONS } from '../learning/curriculum';

// Eager only inside this test. Production data is imported by individual lazy lessons.
const lessons = Object.values(import.meta.glob('../learning/lessons/*.js', { eager: true }))
  .map(module => module.default).filter(lesson => lesson.classModel);
const byId = Object.fromEntries(lessons.map(lesson => [lesson.id, lesson]));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () { this.removeAttribute('open'); });
});
afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('Canonical lesson class models', () => {
  it('covers the guide and fifteen individual OOP lessons without requiring the capstone', () => {
    expect(Object.keys(byId)).toEqual(expect.arrayContaining([
      'how-to-learn-lld', 'classes-and-objects', 'constructors', 'access-modifiers',
      'enums', 'interfaces', 'encapsulation', 'abstraction', 'inheritance', 'polymorphism',
      'overloading-and-overriding', 'static-and-instance', 'association', 'aggregation',
      'composition', 'dependency',
    ]));
  });

  it.each(lessons.map(lesson => [lesson.id, lesson]))('%s has readable compartments and a complete text alternative', (_id, lesson) => {
    const model = lesson.classModel;
    const { container } = render(<LessonClassModel model={model} />);
    expect(screen.getByRole('heading', { name: model.title, level: 2 })).toBeVisible();
    expect(container.querySelectorAll('.lesson-class-model-type')).toHaveLength(model.classes.length);
    const explanationToggle = screen.getByText('Text explanation', { selector: 'summary' });
    const explanation = explanationToggle.parentElement;
    fireEvent.click(explanationToggle);
    explanation.open = true; // happy-dom does not implement summary's native activation.
    expect(explanation).toBeVisible();
    for (const type of model.classes) {
      const typeText = within(explanation).getByRole('heading', { name: `${type.name} — ${type.kind}` }).parentElement;
      expect(typeText).toBeVisible();
      expect(within(typeText).getByText(`Source: ${type.source}`)).toBeVisible();
      expect(explanation).toHaveTextContent(type.description);
      for (const member of [...type.fields, ...type.methods]) expect(explanation).toHaveTextContent(member);
      // A source provenance guard, not a Java parser or semantic proof.
      const source = lesson.code.find(block => block.filename === type.source)?.source;
      expect(source, `${type.name} must come from the displayed canonical Java`).toBeTruthy();
      expect(source).toMatch(new RegExp(`(?:class|interface|enum)\\s+${type.name.split('.').at(-1)}\\b`));
    }
    for (const relationship of model.relationships) {
      expect(model.classes.some(type => type.name === relationship.from)).toBe(true);
      expect(model.classes.some(type => type.name === relationship.to)).toBe(true);
      expect(explanation).toHaveTextContent(`${relationship.kind}: ${relationship.from} → ${relationship.to}`);
      expect(explanation).toHaveTextContent(relationship.explanation);
      if (relationship.multiplicity) expect(explanation).toHaveTextContent(relationship.multiplicity);
      if (relationship.navigation) expect(explanation).toHaveTextContent(relationship.navigation);
    }
    if (!model.relationships.length) expect(explanation).toHaveTextContent(model.noRelationships);
    model.notes.forEach(note => expect(explanation).toHaveTextContent(note));
    // Visual duplicates do not create a second screen-reader traversal.
    expect(container.querySelector('.lesson-class-model-canvas')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('.lesson-class-model-canvas button, .lesson-class-model-canvas a')).toHaveLength(0);
    fireEvent.click(screen.getByText('Diagram legend', { selector: 'summary' }));
    expect(screen.getByText(/not object snapshots, JVM execution or memory layouts/)).toBeInTheDocument();
  });

  it('distinguishes source-supported optional, shared and exclusive links', () => {
    const association = byId.association.classModel.relationships[0];
    expect(association.kind).toBe('Association');
    expect(association.multiplicity).toContain('0..1 tutor');
    expect(association.navigation).toContain('no learner list or reverse reference');
    expect(byId.association.code.find(block => block.filename.endsWith('AssociationLearner.java')).source)
      .toContain('private AssociationTutor tutor;');
    const aggregation = byId.aggregation.classModel.relationships[0];
    expect(aggregation.kind).toBe('Shared aggregation');
    expect(aggregation.multiplicity).toContain('each track ← 0..* playlists');
    expect(byId.aggregation.code.find(block => block.filename.endsWith('Track.java')).source)
      .not.toMatch(/private\s+(?:final\s+)?Playlist\s/);
    const composition = byId.composition.classModel.relationships[0];
    expect(composition.kind).toBe('Composition');
    expect(composition.multiplicity).toContain('including after retirement');
    const document = byId.composition.code.find(block => block.filename.endsWith('Document.java')).source;
    expect(document).toContain('private Page(Document owner, String text)');
    expect(document).toContain('if (page.owner != this)');
    expect(document).toContain('for (Page page : pages) page.retire();');
    expect(byId.composition.classModel.notes.join(' ')).toContain('no garbage-collection timing');
  });

  it('keeps parameter use, concrete construction and stored injection distinct', () => {
    const model = byId.dependency.classModel;
    expect(model.classes.find(type => type.name === 'QuoteService').fields).toEqual([]);
    expect(model.classes.find(type => type.name === 'QuoteSession').fields).toEqual(['- policy: FeePolicy {final}']);
    expect(model.relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'QuoteService', to: 'FeePolicy', kind: 'Dependency' }),
      expect.objectContaining({ from: 'QuoteService', to: 'FlatFeePolicy', kind: 'Dependency' }),
      expect.objectContaining({ from: 'QuoteSession', to: 'FeePolicy', kind: 'Association' }),
      expect.objectContaining({ from: 'QuoteSession', to: 'QuoteService', kind: 'Dependency' }),
    ]));
    expect(model.notes.join(' ')).toContain('does not establish ownership or full Dependency Inversion');
  });
});

describe('Lesson viewer integration', () => {
  it('fits a narrow viewport, bounds zoom and restores scale and scroll', () => {
    render(<LessonClassModel model={byId.composition.classModel} />);
    const viewport = screen.getByRole('region', { name: /scrollable diagram/ });
    Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 264 });
    const scroll = vi.spyOn(viewport, 'scrollTo');
    fireEvent.click(screen.getByRole('button', { name: 'Fit width' }));
    expect(viewport.firstElementChild.style.width).toBe('264px');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('47%');
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    for (let index = 0; index < 15; index++) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    for (let index = 0; index < 25; index++) fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
  });

  it('focuses fullscreen controls, restores focus on cancel and preserves scroll cleanup', () => {
    const view = render(<LessonClassModel model={byId.dependency.classModel} />);
    const enter = screen.getByRole('button', { name: 'Fullscreen', exact: true });
    enter.focus();
    fireEvent.click(enter);
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveFocus();
    expect(screen.getByRole('dialog', { name: `${byId.dependency.classModel.title} viewer` })).toBeVisible();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fullscreen', exact: true })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen', exact: true }));
    view.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('renders the optional lazy model and lesson anchor, preserving lessons without a model', async () => {
    const lesson = byId['classes-and-objects'];
    const metadata = LESSONS.find(entry => entry.id === lesson.id);
    const view = render(<MemoryRouter><LessonContent lesson={lesson} metadata={metadata} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Class model', exact: true })).toHaveAttribute('href', '#lesson-class-model');
    expect(await screen.findByRole('heading', { name: lesson.classModel.title, level: 2 })).toBeVisible();
    view.rerender(<MemoryRouter><LessonContent lesson={{ ...lesson, classModel: undefined }} metadata={metadata} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Class model', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: lesson.classModel.title })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Read the Java, then predict' })).toBeVisible();
  });
});
