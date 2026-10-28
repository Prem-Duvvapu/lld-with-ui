// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import { findLesson, PUBLISHED_LESSONS } from '../learning/curriculum';
import { loadLesson } from '../learning/lessonLoader';
import lesson from '../learning/lessons/class-diagram';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const readExample = filename => fs.readFileSync(path.resolve(testDirectory, '../learning/examples', filename), 'utf8');
const readRepo = filename => fs.readFileSync(path.resolve(testDirectory, '../../..', filename), 'utf8');

function openLesson() {
  return render(<MemoryRouter initialEntries={['/learn/class-diagram']}>
    <LessonContent lesson={lesson} metadata={findLesson(lesson.id)} />
  </MemoryRouter>);
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('Dedicated Class Diagram lesson', () => {
  it('publishes the existing ID after its published prerequisites and loads only canonical content', async () => {
    const metadata = findLesson('class-diagram');
    expect(metadata.status).toBe('published');
    expect(metadata.group).toBe('uml');
    expect(metadata.duration).toBe('35–45 minutes');
    expect(metadata.prerequisites).toEqual(['association', 'inheritance', 'interfaces', 'aggregation', 'composition', 'dependency']);
    for (const id of metadata.prerequisites) {
      expect(findLesson(id).status).toBe('published');
      expect(PUBLISHED_LESSONS.findIndex(entry => entry.id === id)).toBeLessThan(PUBLISHED_LESSONS.indexOf(metadata));
    }
    expect(await loadLesson('class-diagram')).toBe(lesson);
    expect(lesson.code).toHaveLength(6);
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('com.lld.learning.examples.classdiagram.ClassDiagramDemo');
    expect(lesson.output).toBe(readExample('class-diagram-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('class-diagram-snapshots.json')));
  });

  it('integrates through the shared lazy class model with six selectable typed relationships and a full transcript', async () => {
    const { container } = openLesson();
    expect(screen.getByRole('heading', { name: 'Class Diagram', level: 1 })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Class model', exact: true })).toHaveAttribute('href', '#lesson-class-model');
    expect(await screen.findByRole('heading', { name: lesson.classModel.title, level: 2 }, { timeout: 5000 })).toBeVisible();
    const selector = screen.getByRole('combobox', { name: 'Class model view' });
    expect(within(selector).getAllByRole('option')).toHaveLength(7);
    expect(container.querySelectorAll('.lesson-class-model-type')).toHaveLength(6);
    const transcriptToggle = screen.getByText('Text explanation', { selector: 'summary' });
    const transcript = transcriptToggle.parentElement;
    transcript.open = true;
    for (const [index, relationship] of lesson.classModel.relationships.entries()) {
      fireEvent.change(selector, { target: { value: String(index) } });
      expect(container.querySelectorAll('.lesson-class-model-type')).toHaveLength(2);
      expect(container.querySelector('svg[data-kind]')).toHaveAttribute('data-kind', relationship.kind);
      expect(transcript).toHaveTextContent(relationship.explanation);
      if (relationship.multiplicity) expect(transcript).toHaveTextContent(relationship.multiplicity);
      if (relationship.navigation) expect(transcript).toHaveTextContent(relationship.navigation);
      // The complete text alternative retains all types even when a pair is selected.
      for (const type of lesson.classModel.classes) {
        expect(within(transcript).getByRole('heading', { name: `${type.name} — ${type.kind}` })).toBeVisible();
        for (const member of [...type.fields, ...type.methods]) expect(transcript).toHaveTextContent(member);
      }
    }
    fireEvent.change(selector, { target: { value: 'all' } });
    expect(container.querySelectorAll('.lesson-class-model-type')).toHaveLength(6);
  });

  it('renders every verified snapshot scalar and every source with readable labels', () => {
    openLesson();
    const visual = screen.getByRole('heading', { name: lesson.visual.title }).closest('section');
    for (const [index, snapshot] of lesson.visual.snapshots.entries()) {
      const button = screen.getByRole('button', { name: `${index + 1}. ${snapshot.title}` });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(within(visual).getByText(snapshot.explanation)).toBeVisible();
      for (const item of snapshot.items) {
        const card = within(visual).getByRole('heading', { name: `${item.label} : ${item.typeLabel}` }).parentElement;
        for (const field of item.fields) {
          const term = within(card).getAllByRole('term').find(entry => entry.textContent === field.name);
          expect(term).toBeVisible();
          expect(term.nextElementSibling.textContent).toBe(String(field.value));
        }
      }
    }
    for (const block of lesson.code) {
      expect(screen.getByRole('region', { name: `${block.filename}, scrollable code` }).textContent).toBe(block.source.trim());
    }
  });

  it('gives distinct prediction feedback and an independent exercise with inspectable output and rubric', () => {
    openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeVisible();
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
    }
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent).toBe(lesson.output.trim());
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeVisible();
  });

  it('states representation limits and offers source-backed practice with verified primary references', () => {
    openLesson();
    for (const title of ['Choose a viewpoint before drawing boxes', 'Read both ends of a relationship',
      'Keep multiplicity separate from navigation', 'Justify diamonds with domain rules', 'Walk from source to model and back']) {
      expect(screen.getByRole('heading', { name: title })).toBeVisible();
    }
    expect(screen.getByText(/Our accessible viewer instead spells out kind/)).toBeVisible();
    expect(screen.getByText(/This viewer leaves association and diamond connectors without arrowheads/)).toBeVisible();
    expect(screen.getByText(/Domain retirement is a behavior of reachable objects/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Reconcile a class view with Parking Lot source/ })).toHaveAttribute('href', '/parking-lot');
    fireEvent.click(screen.getByText('Inspect the verified module source', { selector: 'summary' }));
    for (const source of lesson.module.sources) {
      expect(readRepo(source).length).toBeGreaterThan(50);
      expect(screen.getByRole('link', { name: source })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${source}`));
    }
    for (const reference of lesson.references) expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
    expect(readRepo('backend/src/test/java/com/lld/learning/ClassDiagramLessonExampleTest.java'))
      .toContain('parkingPracticeClaimsMatchRealDeclarationsIncludingTheIdentifierBoundary');
  });
});
