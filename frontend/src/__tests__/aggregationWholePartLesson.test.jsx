// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import lesson from '../learning/lessons/aggregation';
import { loadLesson } from '../learning/lessonLoader';
import { findLesson } from '../learning/curriculum';

function openLesson() {
  render(<MemoryRouter initialEntries={['/learn/aggregation']}>
    <LessonContent lesson={lesson} metadata={{ ...findLesson('aggregation'), status: 'published', duration: '25–30 minutes' }} />
  </MemoryRouter>);
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('Aggregation whole/part lesson', () => {
  it('loads canonical sources and runnable package paths before parent manifest publication', async () => {
    expect(await loadLesson('aggregation')).toBe(lesson);
    openLesson();
    expect(screen.getByRole('heading', { name: 'Aggregation', level: 1 })).toHaveFocus();
    for (const block of lesson.code) {
      expect(screen.getByRole('region', { name: `${block.filename}, scrollable code` }).textContent)
        .toBe(block.source.trim());
      expect(lesson.run).toContain(block.filename);
    }
    expect(screen.getByRole('region', { name: 'Run locally, scrollable code' })).toHaveTextContent('com.lld.learning.examples.aggregation.AggregationDemo');
  });
  it('renders every recorded scalar through all six snapshot controls', () => {
    openLesson();
    const visual = screen.getByRole('heading', { name: lesson.visual.title }).closest('section');
    for (const [index, snapshot] of lesson.visual.snapshots.entries()) {
      const control = screen.getByRole('button', { name: `${index + 1}. ${snapshot.title}` });
      fireEvent.click(control);
      expect(control).toHaveAttribute('aria-pressed', 'true');
      expect(within(visual).getByText(snapshot.explanation)).toBeVisible();
      for (const item of snapshot.items) {
        const card = within(visual).getByRole('heading', { name: `${item.label} : ${item.typeLabel}` }).parentElement;
        for (const field of item.fields) {
          expect(within(card).getByText(field.name, { selector: 'dt' }).nextElementSibling.textContent).toBe(String(field.value));
        }
      }
    }
    expect(within(visual).getByText(/not garbage-collection timing or a universal UML/)).toBeVisible();
  });
  it('gives feedback for every prediction and displays canonical output', () => {
    openLesson();
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
    }
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent)
      .toBe(lesson.output.trim());
  });
  it('provides a rubric, honest module mapping and primary references', () => {
    openLesson();
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    expect(within(screen.getByText('Self-check rubric').parentElement).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(lesson.module.text)).toHaveTextContent('not proof that one physical spot should belong to several floors');
    expect(screen.getByRole('link', { name: new RegExp(lesson.module.title) })).toHaveAttribute('href', '/parking');
    for (const path of lesson.module.sources) {
      expect(screen.getByRole('link', { name: path })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${path}`));
    }
    for (const reference of lesson.references) {
      expect(screen.getByRole('link', { name: reference.title })).toHaveAttribute('href', reference.url);
    }
  });
});
