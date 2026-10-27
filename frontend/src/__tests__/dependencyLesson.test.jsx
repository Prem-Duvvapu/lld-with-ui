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
import lesson from '../learning/lessons/dependency';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const examples = path.resolve(testDirectory, '../learning/examples');
const readExample = filename => fs.readFileSync(path.join(examples, filename), 'utf8');

// Publication, canonical duration and shared integration remain with the parent.
function openLesson() {
  render(<MemoryRouter initialEntries={['/learn/dependency']}>
    <LessonContent lesson={lesson} metadata={{ ...findLesson('dependency'), status: 'published', duration: '25–30 minutes' }} />
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('Dependency lesson', () => {
  it('loads canonical Java, runnable paths and fixtures without a frontend semantics implementation', async () => {
    expect(await loadLesson('dependency')).toBe(lesson);
    expect(lesson.id).toBe('dependency');
    expect(lesson.code).toHaveLength(6);
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.run).toContain('com.lld.learning.examples.dependency.DependencyDemo');
    expect(lesson.output).toBe(readExample('dependency-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('dependency-snapshots.json')));
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    for (const snapshot of lesson.visual.snapshots) {
      expect(snapshot.items.length).toBeGreaterThan(0);
      for (const item of snapshot.items) {
        expect(item.typeLabel).toBeTruthy();
        for (const field of item.fields) {
          expect(['string', 'number', 'boolean']).toContain(typeof field.value);
        }
      }
    }
  });

  it('renders every recorded field when its illustration step is selected', () => {
    openLesson();
    expect(screen.getByRole('heading', { name: 'Dependency', level: 1 })).toHaveFocus();
    const visual = screen.getByRole('heading', { name: lesson.visual.title }).closest('section');
    for (const [index, snapshot] of lesson.visual.snapshots.entries()) {
      const button = screen.getByRole('button', { name: `${index + 1}. ${snapshot.title}` });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(within(visual).getByText(snapshot.explanation)).toBeVisible();
      for (const item of snapshot.items) {
        const card = within(visual).getByRole('heading', { name: `${item.label} : ${item.typeLabel}` }).parentElement;
        const fields = within(card).getAllByRole('term');
        expect(fields).toHaveLength(item.fields.length);
        for (const field of item.fields) {
          const term = fields.find(entry => entry.textContent === field.name);
          expect(term).toBeVisible();
          expect(term.nextElementSibling).toHaveTextContent(String(field.value));
        }
      }
    }
    for (const block of lesson.code) {
      const region = screen.getByRole('region', { name: `${block.filename}, scrollable code` });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region.textContent).toBe(block.source.trim());
    }
  });

  it('corrects field and rebinding misconceptions and reveals the Java output', () => {
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

  it('offers an implementable contract exercise, accurate limits and actual module source links', () => {
    openLesson();
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    for (const point of lesson.rubric) expect(screen.getByText(point)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Distinguish dependency, injection and DIP' })).toBeVisible();
    expect(screen.getByText(/does not demonstrate a fully separated architecture/)).toBeVisible();
    expect(screen.getByText(/The absence of a collaborator field does not tell you when the supplier dies/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Trace pricing dependencies in Parking Lot/ })).toHaveAttribute('href', '/parking-lot');
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
