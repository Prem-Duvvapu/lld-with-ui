// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import LessonContent from '../learning/LessonContent';
import lesson from '../learning/lessons/oop-overview';
import { loadLesson } from '../learning/lessonLoader';
import { findLesson } from '../learning/curriculum';

function openLesson() {
  // Parent owns publication/prerequisites; this exercises the real content loader and renderer.
  render(<MemoryRouter initialEntries={['/learn/oop-overview']}>
    <LessonContent lesson={lesson} metadata={{ ...findLesson('oop-overview'), status: 'published', duration: '35–45 minutes' }} />
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('OOP overview capstone', () => {
  it('offers fifteen distinct canonical concept reviews, preserving the four proposed additions', async () => {
    expect(await loadLesson('oop-overview')).toBe(lesson);
    openLesson();
    expect(screen.getByRole('heading', { level: 1, name: '15 Must-Know OOP Concepts' })).toHaveFocus();
    const understand = screen.getByRole('heading', { name: 'Start with the problem' }).closest('section');
    const concepts = [
      'classes-and-objects', 'constructors', 'access-modifiers', 'enums', 'static-and-instance',
      'interfaces', 'encapsulation', 'abstraction', 'inheritance', 'polymorphism',
      'overloading-and-overriding', 'association', 'aggregation', 'composition', 'dependency',
    ];
    const links = within(understand).getAllByRole('link');
    expect(links).toHaveLength(15);
    for (const id of concepts) {
      const metadata = findLesson(id);
      expect(metadata).toBeDefined();
      expect(within(understand).getByRole('link', { name: `Revisit ${metadata.title}` }))
        .toHaveAttribute('href', `/learn/${id}`);
    }
    expect(within(understand).getAllByRole('heading', { name: /\(proposed addition\)/ })).toHaveLength(4);
    expect(screen.getByText(lesson.outcome)).toBeVisible();
    expect(screen.getByText(lesson.summary)).toHaveTextContent(/capstone after the fifteen concept lessons/i);
  });

  it('preserves the catalog origin through inline concept review links', () => {
    const origin = { learnCatalog: { search: '?section=oop&bookmarked=1', key: 'origin', lessonId: 'oop-overview' } };
    function Destination() {
      return <output aria-label="Navigation state">{JSON.stringify(useLocation().state)}</output>;
    }
    render(<MemoryRouter initialEntries={[{ pathname: '/learn/oop-overview', state: origin }]}>
      <Routes>
        <Route path="/learn/oop-overview" element={<LessonContent lesson={lesson} metadata={findLesson('oop-overview')} />} />
        <Route path="/learn/classes-and-objects" element={<Destination />} />
      </Routes>
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('link', { name: 'Revisit Classes and Objects', exact: true }));
    expect(JSON.parse(screen.getByLabelText('Navigation state').textContent)).toEqual(origin);
  });

  it('displays exact canonical Java sources and self-contained JDK 17 save/run paths', () => {
    openLesson();
    expect(lesson.code.map(block => block.filename)).toEqual([
      'oopoverview/Topic.java', 'oopoverview/PromptStyle.java', 'oopoverview/PlainPrompt.java',
      'oopoverview/HintedPrompt.java', 'oopoverview/StudyPlan.java', 'oopoverview/OopOverviewDemo.java',
    ]);
    for (const block of lesson.code) {
      expect(screen.getByRole('region', { name: `${block.filename}, scrollable code` }).textContent)
        .toBe(block.source.trim());
      expect(lesson.run).toContain(block.filename);
    }
    expect(screen.getByRole('region', { name: 'Run locally, scrollable code' }))
      .toHaveTextContent('javac --release 17 -d out');
    expect(lesson.run).toContain('java -cp out com.lld.learning.examples.oopoverview.OopOverviewDemo');
    expect(screen.getByRole('region', { name: 'Expected output, checked by Java tests, scrollable code' }).textContent)
      .toBe(lesson.output.trim());
  });

  it('lets learners inspect aliases, shared identity, dispatch and retirement through recorded steps', () => {
    openLesson();
    const visual = screen.getByRole('heading', { name: 'Inspect plans, shared topics and retired entries' }).closest('section');
    expect(within(visual).getByText('focus + alias')).toBeVisible();
    expect(within(visual).getByText(/not a live JVM or a memory-layout diagram/)).toBeVisible();

    const share = screen.getByRole('button', { name: '2. Share a topic, own separate entries' });
    fireEvent.click(share);
    expect(share).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1. Construct independent plans' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(visual).getByText('topic + first.topic() + second.topic()')).toBeVisible();
    const first = within(visual).getByRole('heading', { name: 'first : StudyPlan.Entry' }).parentElement;
    expect(within(first).getByText('first == second')).toBeVisible();
    expect(within(first).getAllByText('false')).toHaveLength(2);
    const topic = within(visual).getByRole('heading', { name: 'topic : Topic' }).parentElement;
    expect(within(topic).getByText('true')).toBeVisible();
    expect(within(visual).getByText(/diamond is justified by restricted construction/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '3. Use one prompt contract' }));
    expect(within(visual).getByText('Review: Objects (give an example)')).toBeVisible();
    expect(within(visual).getByText(/policy is used for this call and is not retained/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '4. Reject duplicate identity' }));
    expect(within(visual).getByText('Topic already selected')).toBeVisible();
    expect(within(visual).getByText('IllegalArgumentException')).toBeVisible();
    expect(within(visual).getByText('1')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '5. Archive one whole, keep the catalog' }));
    expect(within(visual).getByText('first + saved.get(0)')).toBeVisible();
    expect(within(visual).getByText('Entry is retired')).toBeVisible();
    expect(within(visual).getByText('ARCHIVED')).toBeVisible();
    expect(within(visual).getByText('OPEN')).toBeVisible();
    expect(within(visual).getByText('Review: References (give an example)')).toBeVisible();
    expect(within(visual).getByText('Review: Objects (give an example)')).toBeVisible();
    expect(within(visual).getByText(/not garbage collection/)).toBeVisible();
  });

  it('explains the correct prediction and three distinct reference/dispatch misconceptions', () => {
    openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeVisible();
    expect(lesson.quiz.options.filter(option => option.correct)).toHaveLength(1);
    for (const option of lesson.quiz.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.text }));
      fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
      expect(screen.getByText(option.feedback)).toBeVisible();
    }
  });

  it('provides an independent modeling exercise, criteria and inspectable production evidence with limits', () => {
    openLesson();
    expect(screen.getByText(lesson.exercise)).toBeVisible();
    expect(screen.getByText(lesson.exercise)).toHaveTextContent(/Keep Topic free of review progress/);
    const rubric = screen.getByText('Self-check rubric').parentElement;
    expect(within(rubric).getAllByRole('listitem')).toHaveLength(6);
    expect(within(rubric).getByText(/owner identity/)).toBeInTheDocument();
    expect(within(rubric).getByText(/Justify composition of Entry separately/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Audit a real policy boundary in Parking Lot/ })).toHaveAttribute('href', '/parking-lot');
    expect(screen.getByText(lesson.module.text)).toHaveTextContent(/does not establish exclusive ticket ownership/);
    expect(screen.getByText(lesson.module.text)).toHaveTextContent(/not a concurrency or rollback proof/);
    for (const path of lesson.module.sources) {
      expect(screen.getByRole('link', { name: path })).toHaveAttribute('href', expect.stringContaining(`/blob/main/${path}`));
    }
    expect(screen.getByRole('link', { name: /OMG UML 2.5.1/ })).toHaveAttribute('href', 'https://www.omg.org/spec/UML/2.5.1');
    expect(screen.getByRole('link', { name: /JLS 17 §15.12/ })).toHaveAttribute('href', expect.stringContaining('jls/se17'));
  });
});
