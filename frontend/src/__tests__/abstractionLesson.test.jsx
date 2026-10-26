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
import lesson from '../learning/lessons/abstraction';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const readExample = filename => fs.readFileSync(path.resolve(testDirectory, '../learning/examples', filename), 'utf8');

// Publication and curriculum-wide counts are integrated by the parent change.
// Exercise the existing renderer directly while this topic remains planned here.
function openLesson() {
  return render(<MemoryRouter initialEntries={['/learn/abstraction']}>
    <LessonContent lesson={lesson} metadata={{ ...findLesson('abstraction'), duration: '20–25 minutes' }} />
  </MemoryRouter>);
}

beforeEach(() => localStorage.clear());

describe('Abstraction lesson vertical slice', () => {
  it('loads lazily and displays only canonical Java, output and snapshot fixtures', async () => {
    expect(await loadLesson('abstraction')).toBe(lesson);
    expect(lesson.id).toBe('abstraction');
    for (const block of lesson.code) {
      expect(block.source).toBe(readExample(block.filename));
      expect(lesson.run).toContain(block.filename);
    }
    expect(lesson.output).toBe(readExample('abstraction-output.txt'));
    expect(lesson.visual.snapshots).toEqual(JSON.parse(readExample('abstraction-snapshots.json')));
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    for (const source of lesson.module.sources) {
      expect(fs.existsSync(path.resolve(testDirectory, '../../..', source))).toBe(true);
    }
  });

  it('shows common state, distinct results, shared short-text behavior and rejection', () => {
    openLesson();
    expect(screen.getByRole('heading', { level: 1, name: 'Abstraction' })).toHaveFocus();
    expect(screen.getByText(/recorded illustration verified against the Java example/)).toBeInTheDocument();
    expect(screen.getAllByText('TopicLabel', { exact: true })).toHaveLength(2);
    expect(screen.getAllByText('8', { exact: true })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '2. Vary the hidden shortening step' }));
    expect(screen.getByText('Encap...', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Encapsul', { exact: true })).toBeInTheDocument();
    expect(screen.getAllByText(' Encapsulation ', { exact: true, normalizer: text => text })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '3. Reuse the concrete common behavior' }));
    expect(screen.getAllByText('OOP', { exact: true, normalizer: text => text })).toHaveLength(2);
    expect(screen.getAllByText('Study: OOP', { exact: true })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '4. Check the shared boundary' }));
    expect(screen.getByText('Topic is required', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Limit must be at least 4', { exact: true })).toBeInTheDocument();
    expect(screen.getAllByText('   ', { exact: true, normalizer: text => text })).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'BoundedTopicLabel.java, scrollable code' })).toHaveAttribute('tabindex', '0');
  });

  it('explains incorrect predictions and the verified shared-method and subclass call path', () => {
    openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'It cannot run because the abstract base has no constructor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/concrete subclass calls it with super\(8\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Study: Encap...; the base strips and checks, then the subclass shortens' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/reserves three characters for dots/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Compare with the Java output', { selector: 'summary' }));
    const output = screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' });
    expect(output.textContent).toBe(lesson.output.trim());
    expect(screen.getByRole('button', { name: 'Mark lesson reviewed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('provides a debugging task, inspectable rubric, tradeoffs and supported module links', () => {
    openLesson();
    expect(screen.getByText(/proposed TailTopicLabel/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Self-check rubric', { selector: 'summary' }));
    expect(screen.getByText(/final locks the render implementation/)).toBeInTheDocument();
    expect(screen.getByText(/Check ...ation at limit 8 and ...n at limit 4/)).toBeInTheDocument();
    expect(screen.getByText(/can split a surrogate pair/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inspect Coffee Machine’s contract and abstract base/ })).toHaveAttribute('href', '/coffee-machine');
    fireEvent.click(screen.getByText('Inspect the verified module source', { selector: 'summary' }));
    const sources = screen.getByText('Inspect the verified module source', { selector: 'summary' }).parentElement;
    expect(within(sources).getAllByRole('link')).toHaveLength(4);
    for (const source of lesson.module.sources) {
      expect(within(sources).getByRole('link', { name: source }).getAttribute('href')).toContain(`/blob/main/${source}`);
    }
  });
});
