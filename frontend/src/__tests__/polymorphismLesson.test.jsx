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
import lesson from '../learning/lessons/polymorphism';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const readExample = filename => fs.readFileSync(path.resolve(testDirectory, '../learning/examples', filename), 'utf8');

// The parent publishes this lesson and integrates catalog counts separately.
function openLesson() {
  return render(<MemoryRouter initialEntries={['/learn/polymorphism']}>
    <LessonContent lesson={lesson} metadata={{ ...findLesson('polymorphism'), duration: '25–30 minutes' }} />
  </MemoryRouter>);
}

beforeEach(() => localStorage.clear());

describe('Polymorphism lesson vertical slice', () => {
  it('loads canonical Java and verified fixtures with renderer-compatible scalar fields', async () => {
    expect(await loadLesson('polymorphism')).toBe(lesson);
    expect(lesson.id).toBe('polymorphism');
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.output).toBe(readExample('polymorphism-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('polymorphism-snapshots.json')));
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    for (const snapshot of lesson.visual.snapshots) {
      expect(new Set(snapshot.items.map(item => item.label)).size).toBe(snapshot.items.length);
      for (const item of snapshot.items) {
        expect(item.typeLabel).toBeTruthy();
        expect(new Set(item.fields.map(field => field.name)).size).toBe(item.fields.length);
        expect(item.fields.every(field => ['string', 'number', 'boolean'].includes(typeof field.value))).toBe(true);
      }
    }
    for (const source of lesson.module.sources) {
      expect(fs.existsSync(path.resolve(testDirectory, '../../..', source))).toBe(true);
    }
  });

  it('renders aliases, runtime dispatch, selected overloads and hidden members as distinct steps', () => {
    openLesson();
    expect(screen.getByRole('heading', { name: 'Polymorphism', level: 1 })).toHaveFocus();
    expect(screen.getByText('hinted + base + role')).toBeInTheDocument();
    expect(screen.getByText('true', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Explain Objects', { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/recorded illustration verified against the Java example/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2. Dispatch the overridden instance method' }));
    expect(screen.getAllByText('Explain Objects (hint: name one object)', { exact: true })).toHaveLength(2);
    expect(screen.getAllByText(' Objects ', { exact: true, normalizer: text => text })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '3. Select an overload before runtime dispatch' }));
    expect(screen.getByText('open overload: Explain Objects (hint: name one object)', { exact: true, selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('hinted overload: Explain Objects (hint: name one object)', { exact: true, selector: 'dd' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '4. Contrast fields and static methods' }));
    expect(screen.getByText('open/open', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('hinted/hinted', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'PolymorphismDemo.java, scrollable code' })).toHaveAttribute('tabindex', '0');
  });

  it('explains both overload and override prediction mistakes before showing recorded Java output', () => {
    openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'hinted overload: Explain Objects (hint: name one object)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/Runtime dispatch does not choose a new select signature/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'open overload: Explain Objects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/receiver is still the hinted object/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'open overload: Explain Objects (hint: name one object)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/declared argument type selects the open overload/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent)
      .toBe(lesson.output.trim());
    expect(screen.getByRole('button', { name: 'Mark lesson reviewed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers a debugging exercise, explicit alternatives and source-backed module application', () => {
    openLesson();
    expect(screen.getByText(/proposed ChecklistPracticeQuestion/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    expect(screen.getByText(/Identify ask\(Object\) as an overload/)).toBeInTheDocument();
    expect(screen.getByText(/different signatures known at the call site/)).toBeInTheDocument();
    expect(screen.getByText(/throws ClassCastException at runtime/)).toBeInTheDocument();
    expect(screen.getByText(/No browser control schedules or executes Java/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inspect a polymorphic pricing call in Parking Lot/ })).toHaveAttribute('href', '/parking-lot');
    const sourceSummary = screen.getByText('Inspect the verified module source', { selector: 'summary' });
    fireEvent.click(sourceSummary);
    const sources = sourceSummary.parentElement;
    expect(within(sources).getAllByRole('link')).toHaveLength(5);
    for (const source of lesson.module.sources) {
      expect(within(sources).getByRole('link', { name: source }).getAttribute('href')).toContain(`/blob/main/${source}`);
    }
  });
});
