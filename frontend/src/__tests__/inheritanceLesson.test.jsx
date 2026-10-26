// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import lesson from '../learning/lessons/inheritance';
import { loadLesson } from '../learning/lessonLoader';
import { findLesson } from '../learning/curriculum';

// Publication is integrated by the parent; exercise the real content and renderer independently.
function openLesson() {
  return render(<MemoryRouter initialEntries={['/learn/inheritance']}>
    <LessonContent lesson={lesson} metadata={{
      ...findLesson('inheritance'),
      status: 'published',
      duration: '20–25 minutes',
      prerequisites: ['classes-and-objects', 'access-modifiers', 'constructors'],
    }} />
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('Inheritance lesson vertical slice', () => {
  it('loads canonical Java through the lesson loader and exposes runnable save paths', async () => {
    expect(await loadLesson('inheritance')).toBe(lesson);
    openLesson();
    expect(screen.getByRole('heading', { name: 'Inheritance', level: 1 })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Review Constructors and Initialization' })).toHaveAttribute('href', '/learn/constructors');
    for (const block of lesson.code) {
      expect(screen.getByRole('region', { name: `${block.filename}, scrollable code` })).toHaveTextContent(block.source.trim().replace(/\s+/g, ' '));
      expect(lesson.run).toContain(block.filename);
    }
    expect(screen.getByRole('region', { name: 'Run locally, scrollable code' })).toHaveTextContent('java -cp out com.lld.learning.examples.inheritance.InheritanceDemo');
  });

  it('shows construction, inherited identity, dispatch and composition as distinct recorded steps', () => {
    openLesson();
    const visual = screen.getByRole('heading', { name: 'From construction to an inherited call' }).closest('section');
    expect(within(visual).getByText('resource initialized: Inheritance')).toBeVisible();
    expect(within(visual).getByText('video initialized: 12 min')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '2. Use inherited behavior' }));
    expect(within(visual).getByText('video + resource')).toBeVisible();
    expect(within(visual).getByText('true')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '3. Dispatch the same instance call' }));
    expect(within(visual).getByText('Resource: Objects')).toBeVisible();
    expect(within(visual).getByText('Resource: Inheritance (video, 12 min)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '4. Compose a playlist' }));
    expect(within(visual).getByText('false')).toBeVisible();
    expect(within(visual).getByText('Next: Resource: Inheritance (video, 12 min)')).toBeVisible();
    expect(within(visual).getByText(/no exclusive-ownership or lifetime guarantee/)).toBeVisible();
  });

  it('distinguishes runtime override selection from the declared API in prediction feedback', () => {
    openLesson();
    fireEvent.click(screen.getByRole('radio', { name: lesson.quiz.options[0].text }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(lesson.quiz.options[0].feedback)).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: lesson.quiz.options[2].text }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(lesson.quiz.options[2].feedback)).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: lesson.quiz.options[1].text }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(lesson.quiz.options[1].feedback)).toBeVisible();
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' })).toHaveTextContent(lesson.output.trim().replace(/\s+/g, ' '));
  });

  it('provides a concrete exercise, behavioral rubric and inspectable module evidence', () => {
    openLesson();
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    const rubric = screen.getByText('Self-check rubric').parentElement;
    expect(within(rubric).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /Inspect inheritance and wrapping in Coffee Machine/ })).toHaveAttribute('href', '/coffee-machine');
    for (const path of lesson.module.sources) {
      expect(screen.getByRole('link', { name: path })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${path}`));
    }
  });
});
