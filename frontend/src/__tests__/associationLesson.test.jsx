// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import lesson from '../learning/lessons/association';
import { loadLesson } from '../learning/lessonLoader';
import { findLesson } from '../learning/curriculum';

// Parent integrates publication; exercise the real loader and renderer without editing the manifest.
function openLesson() {
  render(<MemoryRouter initialEntries={['/learn/association']}>
    <LessonContent lesson={lesson} metadata={{ ...findLesson('association'), status: 'published', duration: '20–25 minutes' }} />
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('Association lesson', () => {
  it('loads canonical Java and provides runnable paths plus the textual class relationship', async () => {
    expect(await loadLesson('association')).toBe(lesson);
    openLesson();
    expect(screen.getByRole('heading', { name: 'Association', level: 1 })).toHaveFocus();
    for (const block of lesson.code) {
      expect(screen.getByRole('region', { name: `${block.filename}, scrollable code` }))
        .toHaveTextContent(block.source.trim().replace(/\s+/g, ' '));
      expect(lesson.run).toContain(block.filename);
    }
    const visual = screen.getByRole('heading', { name: 'Inspect the learner–tutor links' }).closest('section');
    expect(within(visual).getByText(/AssociationLearner \[0\.\.\*\] --tutor--> \[0\.\.1\] AssociationTutor/)).toBeVisible();
    expect(within(visual).getByText('Ada -> unassigned')).toBeVisible();
  });

  it('renders sharing, reassignment, rejected validation and clearing from the recorded snapshots', () => {
    openLesson();
    const visual = screen.getByRole('heading', { name: 'Inspect the learner–tutor links' }).closest('section');
    fireEvent.click(screen.getByRole('button', { name: '2. Share a tutor' }));
    expect(within(visual).getByText('mira + ada.tutor + ben.tutor')).toBeVisible();
    expect(within(visual).getByText('true')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '3. Replace one link' }));
    expect(within(visual).getByText('Ada -> Noor (Java)')).toBeVisible();
    expect(within(visual).getByText('Ben -> Mira (Java)')).toBeVisible();
    expect(within(visual).getByText('false')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '4. Reject an incompatible link' }));
    expect(within(visual).getByText('Tutor subject must match Java')).toBeVisible();
    expect(within(visual).getByText('Ada -> Noor (Java)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '5. Clear links, keep using tutors' }));
    expect(within(visual).getByText('Ada -> unassigned')).toBeVisible();
    expect(within(visual).getByText('Ben -> unassigned')).toBeVisible();
    expect(within(visual).getByText('Mira (Java)')).toBeVisible();
    expect(within(visual).getByText('Noor (Java)')).toBeVisible();
    expect(within(visual).getByText(/not garbage-collection timing/)).toBeVisible();
  });

  it('provides corrective feedback for copied-object and shared-field misconceptions', () => {
    openLesson();
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
    }
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }))
      .toHaveTextContent(lesson.output.trim().replace(/\s+/g, ' '));
  });

  it('offers an assignment exercise with a rubric and inspectable Uber source evidence', () => {
    openLesson();
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    expect(within(screen.getByText('Self-check rubric').parentElement).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /Trace the Ride-to-Driver association in Uber/ })).toHaveAttribute('href', '/uber');
    for (const path of lesson.module.sources) {
      expect(screen.getByRole('link', { name: path })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${path}`));
    }
  });
});
