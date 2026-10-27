// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import { findLesson } from '../learning/curriculum';
import { loadLesson } from '../learning/lessonLoader';
import lesson from '../learning/lessons/how-to-learn-lld';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(testDirectory, '../learning/examples');
const readExample = filename => fs.readFileSync(path.join(examples, filename), 'utf8');

// Parent owns publication and duration; use the current renderer with the real manifest entry.
function openLesson() {
  render(<MemoryRouter initialEntries={['/learn/how-to-learn-lld']}>
    <LessonContent lesson={lesson} metadata={{ ...findLesson(lesson.id), duration: '25–30 minutes' }} />
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('How to Learn LLD guide', () => {
  it('loads canonical Java sources and fixtures with matching save and run paths', async () => {
    expect(await loadLesson(lesson.id)).toBe(lesson);
    expect(findLesson(lesson.id).prerequisites).toEqual([]);
    expect(lesson.code).toHaveLength(2);
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('javac --release 17');
    expect(lesson.run).toContain('com.lld.learning.examples.howtolearn.StudySeatDemo');
    expect(lesson.output).toBe(readExample('howtolearn-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('howtolearn-snapshots.json')));
    expect(lesson.visual.snapshots).toHaveLength(6);
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
  });

  it('presents an introductory workflow, optional Java and distinct practice paths without prerequisite lessons', () => {
    openLesson();
    expect(screen.getByRole('heading', { name: 'How to Learn LLD', level: 1 })).toHaveFocus();
    expect(screen.queryByRole('navigation', { name: 'Prerequisite lessons' })).not.toBeInTheDocument();
    expect(screen.getByText(`Prerequisites: ${lesson.prerequisites}`)).toBeVisible();
    for (const section of lesson.explanation) {
      expect(screen.getByRole('heading', { name: section.title })).toBeVisible();
      expect(screen.getByText(section.text)).toBeVisible();
    }
    expect(screen.getByRole('heading', { name: /Beginner path:/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: /Revision path:/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: /Interview path:/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Use a readiness check to pick the next task' })).toBeVisible();
    for (const block of lesson.code) {
      const region = screen.getByRole('region', { name: `${block.filename}, scrollable code` });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region.textContent).toBe(block.source.trim());
    }
  });

  it('renders every Java-recorded state and rejection field, including the absent holder', () => {
    openLesson();
    const visual = screen.getByRole('heading', { name: lesson.visual.title }).closest('section');
    for (const [index, snapshot] of lesson.visual.snapshots.entries()) {
      const button = screen.getByRole('button', { name: `${index + 1}. ${snapshot.title}` });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(within(visual).getByText(snapshot.explanation)).toBeVisible();
      expect(within(visual).getAllByRole('heading', { level: 3 })).toHaveLength(snapshot.items.length);
      for (const item of snapshot.items) {
        const card = within(visual).getByRole('heading', { name: `${item.label} : ${item.typeLabel}` }).parentElement;
        const terms = within(card).getAllByRole('term');
        expect(terms).toHaveLength(item.fields.length);
        for (const field of item.fields) {
          expect(field.value === null || ['string', 'boolean', 'number'].includes(typeof field.value)).toBe(true);
          const term = terms.find(entry => entry.textContent === field.name);
          expect(term).toBeVisible();
          expect(term.nextElementSibling.textContent).toBe(String(field.value));
        }
      }
    }
  });

  it('requires a prediction, corrects misconceptions and reveals the exact Java output', () => {
    openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeVisible();
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
    }
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent)
      .toBe(lesson.output.trim());
  });

  it('provides a paper-first exercise, observable rubric and inspectable practice evidence with limits', () => {
    openLesson();
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeVisible();
    for (const point of lesson.pitfalls) expect(screen.getByText(point)).toBeVisible();
    expect(screen.getByRole('link', { name: /Practise tracing one Parking Lot allocation/ })).toHaveAttribute('href', '/parking-lot');
    expect(screen.getByText(lesson.module.text)).toBeVisible();
    fireEvent.click(screen.getByText('Inspect the verified module source', { selector: 'summary' }));
    for (const source of lesson.module.sources) {
      expect(fs.existsSync(path.resolve(testDirectory, '../../..', source))).toBe(true);
      expect(screen.getByRole('link', { name: source })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${source}`));
    }
    for (const reference of lesson.references) {
      expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
    }
  });
});
