// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import Learn from '../pages/Learn';
import Lesson from '../pages/Lesson';
import { LESSON_STORAGE_KEY, useLessonProgress } from '../learning/useLessonProgress';
import { loadLesson } from '../learning/lessonLoader';
import content from '../learning/lessons/classes-and-objects';
import enumLesson from '../learning/lessons/enums';
import interfaceLesson from '../learning/lessons/interfaces';
import constructorLesson from '../learning/lessons/constructors';
import accessLesson from '../learning/lessons/access-modifiers';
import encapsulationLesson from '../learning/lessons/encapsulation';
import abstractionLesson from '../learning/lessons/abstraction';
import inheritanceLesson from '../learning/lessons/inheritance';
import polymorphismLesson from '../learning/lessons/polymorphism';
import associationLesson from '../learning/lessons/association';
import aggregationLesson from '../learning/lessons/aggregation';
import compositionLesson from '../learning/lessons/composition';
import dependencyLesson from '../learning/lessons/dependency';
import overloadLesson from '../learning/lessons/overloading-and-overriding';
import staticLesson from '../learning/lessons/static-and-instance';
import guideLesson from '../learning/lessons/how-to-learn-lld';
import capstoneLesson from '../learning/lessons/oop-overview';

vi.mock('../learning/lessonLoader', () => ({ loadLesson: vi.fn() }));

function renderLearning(path = '/learn') {
  return render(<MemoryRouter initialEntries={[path]}><Link to="/learn">Catalog test link</Link><Routes><Route path="/learn" element={<Learn />} /><Route path="/learn/:lessonId" element={<Lesson />} /></Routes></MemoryRouter>);
}

async function openLesson() {
  renderLearning('/learn/classes-and-objects');
  await screen.findByRole('heading', { name: 'Classes and Objects', level: 1 });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  loadLesson.mockReset().mockImplementation(id => Promise.resolve({
    'classes-and-objects': content, enums: enumLesson, interfaces: interfaceLesson,
    constructors: constructorLesson, 'access-modifiers': accessLesson, encapsulation: encapsulationLesson,
    abstraction: abstractionLesson, inheritance: inheritanceLesson,
    polymorphism: polymorphismLesson, association: associationLesson,
    aggregation: aggregationLesson, composition: compositionLesson, dependency: dependencyLesson,
    'overloading-and-overriding': overloadLesson, 'static-and-instance': staticLesson,
    'how-to-learn-lld': guideLesson, 'oop-overview': capstoneLesson,
  }[id]));
});

describe('Published curriculum learning journey', () => {
  it('distinguishes the available lesson from planned topics and filters search accessibly', () => {
    renderLearning();
    expect(screen.getByRole('button', { name: 'Available lessons (17)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Classes and Objects', exact: true })).toHaveAttribute('href', '/learn/classes-and-objects');
    expect(screen.getByRole('link', { name: 'Enums', exact: true })).toHaveAttribute('href', '/learn/enums');
    expect(screen.getByRole('link', { name: 'Interfaces', exact: true })).toHaveAttribute('href', '/learn/interfaces');
    const constructors = screen.getByRole('article', { name: 'Constructors and Initialization' });
    expect(within(constructors).getByRole('link', { name: 'Constructors and Initialization', exact: true })).toHaveAttribute('href', '/learn/constructors');
    expect(within(constructors).getByText('Proposed addition')).toBeVisible();
    expect(constructors).toHaveTextContent('20–25 minutes');
    expect(screen.getByRole('article', { name: 'Access Modifiers' })).toHaveTextContent('Proposed addition');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search lessons' }), { target: { value: 'SOLID' } });
    expect(screen.getByRole('status')).toHaveTextContent('0 available lessons');
    fireEvent.click(screen.getByRole('button', { name: 'View matching roadmap topics' }));
    expect(screen.getByText('SOLID Principles with Pictures')).toBeVisible();
    expect(screen.getByText('SOLID Principles with Code')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('0 available lessons · 2 planned topics');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-match' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear lesson filters' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('starts with the learning guide and keeps its notes separate when entering Java fundamentals', async () => {
    renderLearning();
    const start = screen.getByRole('link', { name: 'Start learning →' });
    expect(start).toHaveAttribute('href', '/learn/how-to-learn-lld');
    fireEvent.click(start);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'How to Learn LLD', level: 1 })).toHaveFocus());
    fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: 'Clarify the scope before choosing classes.' } });
    fireEvent.click(screen.getByRole('link', { name: 'Next: Classes and Objects →' }));
    await screen.findByRole('heading', { name: 'Classes and Objects', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
    fireEvent.click(screen.getByRole('link', { name: '← How to Learn LLD' }));
    await screen.findByRole('heading', { name: 'How to Learn LLD', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Clarify the scope before choosing classes.');
  });

  it('focuses the lesson heading, explains the illustration, and shows independent Java object state', async () => {
    await openLesson();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Classes and Objects', level: 1 })).toHaveFocus());
    const third = screen.getByRole('button', { name: '3. Add an alias and review again' });
    fireEvent.click(third);
    expect(third).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('first + alias')).toBeInTheDocument();
    expect(screen.getByText('One class definition · two object instances · 3 references shown')).toBeInTheDocument();
    expect(screen.getByText(/not a live JVM/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'StudyCard.java, scrollable code' })).toHaveAttribute('tabindex', '0');
  });

  it('gives actionable prediction feedback without making review a quiz gate', async () => {
    await openLesson();
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Choose one answer before checking.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'first: 1, second: 0; three objects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/Assignment copies a reference here/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'first: 2, second: 0; two objects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/Exactly\. first and alias share/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark lesson reviewed' }));
    expect(screen.getByRole('button', { name: 'Mark lesson not reviewed' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows enum parsing and rejection without reusing StudyCard fields', async () => {
    renderLearning('/learn/enums');
    await screen.findByRole('heading', { name: 'Enums', level: 1 });
    expect(screen.getByRole('link', { name: 'Review Classes and Objects' })).toHaveAttribute('href', '/learn/classes-and-objects');
    expect(screen.getByText('LOW, MEDIUM, HIGH')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2. Normalize one input' }));
    expect(screen.getByText('" high "')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3. Reject an unknown name' }));
    expect(screen.getByText('Unsupported priority: urgent')).toBeInTheDocument();
    expect(screen.queryByText('reviewCount')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'valueOf rejects it; parse returns the existing HIGH constant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/Our boundary policy trims and normalizes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark lesson reviewed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows interface dispatch and the shared validation contract for both implementations', async () => {
    renderLearning('/learn/interfaces');
    await screen.findByRole('heading', { name: 'Interfaces', level: 1 });
    expect(screen.getByText('Hello', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2. Substitute a tagged implementation' }));
    expect(screen.getByText('[LLD] Hello', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3. Check the shared contract' }));
    expect(screen.getAllByText('IllegalArgumentException', { exact: true })).toHaveLength(2);
    expect(screen.getAllByText('Text is required', { exact: true })).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'TaggedFormatter.java, scrollable code' })).toHaveAttribute('tabindex', '0');
    fireEvent.click(screen.getByRole('radio', { name: '[LLD] Hello, through TaggedFormatter.format' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/same interface call reaches the tagged implementation/)).toBeInTheDocument();
  });

  it('shows constructor trace prefixes separately from the returned and later-mutated object', async () => {
    renderLearning('/learn/constructors');
    await screen.findByRole('heading', { name: 'Constructors and Initialization', level: 1 });
    expect(screen.getByText('OOP FUNDAMENTALS · 20–25 minutes')).toBeInTheDocument();
    expect(screen.getByText('Proposed addition', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('base topic=Objects', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('25', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3. Return the initialized object' }));
    expect(screen.getByText('25', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '4. Change state after construction' }));
    expect(screen.getByText('30', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Base topic, focused duration, then convenience completion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/super\(\.\.\.\) completes before the full constructor continues/)).toBeInTheDocument();
  });

  it('explains cross-package protected access without hiding its receiver restriction', async () => {
    renderLearning('/learn/access-modifiers');
    await screen.findByRole('heading', { name: 'Access Modifiers', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: '3. A subclass in another package' }));
    const allowed = screen.getByText('protected via child receiver').closest('.learn-field');
    const rejected = screen.getByText('protected via base receiver').closest('.learn-field');
    expect(within(allowed).getByText('allowed')).toBeInTheDocument();
    expect(within(rejected).getByText('rejected')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'outside/VisibilityChild.java, scrollable code' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByText(/Save each file using its shown path/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '4. An unrelated external caller' }));
    expect(screen.getAllByText('rejected', { exact: true })).toHaveLength(3);
    fireEvent.click(screen.getByRole('radio', { name: 'Cross-package protected access restricts the qualifying receiver type' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/compiler checks this boundary/)).toBeInTheDocument();
  });

  it('contrasts a leaked final list with a guarded owner and its unchanged snapshot', async () => {
    renderLearning('/learn/encapsulation');
    await screen.findByRole('heading', { name: 'Encapsulation', level: 1 });
    expect(screen.getByText('true', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review Access Modifiers' })).toHaveAttribute('href', '/learn/access-modifiers');
    fireEvent.click(screen.getByRole('button', { name: '3. Keep the returned snapshot separate' }));
    expect(screen.getByText('UnsupportedOperationException', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '4. Preserve both the snapshot and the invariant' }));
    expect(screen.getByText('[Objects, Interfaces]', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('[Objects]', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'The whole ReadingShelf becomes immutable after calling getTopics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText(/shelf still accepts valid additions/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark lesson reviewed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('navigates between published lessons with fresh interaction state and separate saved notes', async () => {
    await openLesson();
    expect(screen.queryByText(/Next planned concept:/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: 'Class notes' } });
    fireEvent.click(screen.getByRole('button', { name: '3. Add an alias and review again' }));
    fireEvent.click(screen.getByRole('radio', { name: 'first: 2, second: 0; two objects' }));
    fireEvent.click(screen.getByRole('link', { name: 'Next: Constructors and Initialization →' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Constructors and Initialization', level: 1 })).toHaveFocus());
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: 'Constructor notes' } });
    fireEvent.click(screen.getByRole('link', { name: 'Next: Access Modifiers →' }));
    await screen.findByRole('heading', { name: 'Access Modifiers', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
    fireEvent.click(screen.getByRole('link', { name: 'Next: Enums →' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Enums', level: 1 })).toHaveFocus());
    expect(screen.getByRole('button', { name: '1. Inspect the constants' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
    expect(screen.getAllByRole('radio').every(radio => !radio.checked)).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: 'Enum notes' } });
    fireEvent.click(screen.getByRole('link', { name: 'Next: Interfaces →' }));
    await screen.findByRole('heading', { name: 'Interfaces', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
    fireEvent.click(screen.getByRole('link', { name: 'Next: Encapsulation →' }));
    await screen.findByRole('heading', { name: 'Encapsulation', level: 1 });
    expect(screen.getByRole('link', { name: 'Review Access Modifiers' })).toHaveAttribute('href', '/learn/access-modifiers');
    expect(screen.getByRole('link', { name: 'Next: Abstraction →' })).toHaveAttribute('href', '/learn/abstraction');
    fireEvent.click(screen.getByRole('link', { name: '← Interfaces' }));
    await screen.findByRole('heading', { name: 'Interfaces', level: 1 });
    fireEvent.click(screen.getByRole('link', { name: '← Enums' }));
    await screen.findByRole('heading', { name: 'Enums', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Enum notes');
    fireEvent.click(screen.getByRole('link', { name: '← Access Modifiers' }));
    await screen.findByRole('heading', { name: 'Access Modifiers', level: 1 });
    fireEvent.click(screen.getByRole('link', { name: '← Constructors and Initialization' }));
    await screen.findByRole('heading', { name: 'Constructors and Initialization', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Constructor notes');
    fireEvent.click(screen.getByRole('link', { name: '← Classes and Objects' }));
    await screen.findByRole('heading', { name: 'Classes and Objects', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Class notes');
  });

  it('continues through the remaining fundamentals with separate notes and correct prerequisites', async () => {
    renderLearning('/learn/encapsulation');
    await screen.findByRole('heading', { name: 'Encapsulation', level: 1 });
    for (const [title, prerequisite] of [['Abstraction', 'Interfaces'], ['Inheritance', 'Constructors and Initialization'], ['Polymorphism', 'Inheritance'], ['Method Overloading vs Overriding', 'Access Modifiers'], ['Static vs Instance Members', 'Constructors and Initialization']]) {
      fireEvent.click(screen.getByRole('link', { name: `Next: ${title} →` }));
      await waitFor(() => expect(screen.getByRole('heading', { name: title, level: 1 })).toHaveFocus());
      expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
      expect(screen.getByRole('link', { name: `Review ${prerequisite}` })).toBeInTheDocument();
      fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: `${title} notes` } });
      fireEvent.click(screen.getByRole('button', { name: 'Bookmark lesson' }));
    }
    expect(screen.getByRole('link', { name: 'Next: Association →' })).toHaveAttribute('href', '/learn/association');
    fireEvent.click(screen.getByRole('link', { name: '← Method Overloading vs Overriding' }));
    await screen.findByRole('heading', { name: 'Method Overloading vs Overriding', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Method Overloading vs Overriding notes');
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark lesson reviewed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('connects relationships to the capstone with isolated notes and prerequisite reviews', async () => {
    renderLearning('/learn/association');
    await screen.findByRole('heading', { name: 'Association', level: 1 });
    for (const [title, prerequisite] of [['Aggregation', 'Encapsulation'], ['Composition', 'Static vs Instance Members'], ['Dependency', 'Interfaces']]) {
      fireEvent.click(screen.getByRole('link', { name: `Next: ${title} →` }));
      await waitFor(() => expect(screen.getByRole('heading', { name: title, level: 1 })).toHaveFocus());
      expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
      expect(screen.getByRole('link', { name: `Review ${prerequisite}` })).toBeInTheDocument();
      fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: `${title} notes` } });
      fireEvent.click(screen.getByRole('button', { name: 'Bookmark lesson' }));
    }
    fireEvent.click(screen.getByRole('link', { name: 'Next: 15 Must-Know OOP Concepts →' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '15 Must-Know OOP Concepts', level: 1 })).toHaveFocus());
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('');
    expect(within(screen.getByRole('navigation', { name: 'Prerequisite lessons' })).getAllByRole('link')).toHaveLength(15);
    fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: 'Capstone notes' } });
    expect(screen.getByText('Next planned concept: DRY Principle. It is not published yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '← Dependency' }));
    await screen.findByRole('heading', { name: 'Dependency', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Dependency notes');
    fireEvent.click(screen.getByRole('link', { name: '← Composition' }));
    await screen.findByRole('heading', { name: 'Composition', level: 1 });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Composition notes');
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark lesson reviewed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists notes, bookmark, resume and review independently from module progress', async () => {
    localStorage.setItem('lld-progress-v1', JSON.stringify({ parking: 123 }));
    await openLesson();
    fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: 'Each session has independent progress; the alias shares the first.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark lesson' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark lesson reviewed' }));
    fireEvent.click(screen.getByRole('link', { name: '← All lessons' }));
    expect(screen.getByText(/1 of 17 available lessons marked reviewed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bookmarked only' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 available lessons');
    fireEvent.click(screen.getByRole('link', { name: 'Continue learning →' }));
    await screen.findByRole('textbox', { name: 'Your explanation' });
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Each session has independent progress; the alias shares the first.');
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('lld-progress-v1'))).toEqual({ parking: 123 });
    expect(JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY)).lastLessonId).toBe('classes-and-objects');
  });

  it.each(['/learn/dry', '/learn/not-a-lesson'])('renders an honest recovery page for %s without loading content', path => {
    renderLearning(path);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark lesson/ })).not.toBeInTheDocument();
    expect(loadLesson).not.toHaveBeenCalled();
    if (path === '/learn/dry') {
      expect(screen.getByRole('link', { name: 'Start with How to Learn LLD →' })).toHaveAttribute('href', '/learn/how-to-learn-lld');
    }
  });

  it('recovers from a lesson chunk failure without altering saved notes', async () => {
    localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify({ lessons: { 'classes-and-objects': { notes: 'Retain this draft' } } }));
    loadLesson.mockRejectedValueOnce(new Error('chunk unavailable'));
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    const first = renderLearning('/learn/classes-and-objects');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/saved notes and progress have not been changed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload lesson' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY)).lessons['classes-and-objects'].notes).toBe('Retain this draft');
    first.unmount();
    renderLearning('/learn/classes-and-objects');
    expect(await screen.findByRole('textbox', { name: 'Your explanation' })).toHaveValue('Retain this draft');
    expect(loadLesson).toHaveBeenCalledTimes(2);
  });

  it('ignores content arriving after navigation away', async () => {
    let resolve;
    loadLesson.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    renderLearning('/learn/classes-and-objects');
    expect(screen.getByRole('status')).toHaveTextContent('Loading lesson…');
    fireEvent.click(screen.getByRole('link', { name: 'Catalog test link' }));
    await act(async () => resolve(content));
    expect(screen.getByRole('heading', { name: 'Learn low-level design' })).toBeInTheDocument();
    expect(localStorage.getItem(LESSON_STORAGE_KEY)).toBeNull();
  });

  it('bounds and validates stored lesson data and ignores unpublished completion marks', async () => {
    localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify({ lastLessonId: 'dry', lessons: { dry: { reviewed: true }, 'classes-and-objects': { notes: 'x'.repeat(3000), reviewed: 'true', bookmarked: true } } }));
    await openLesson();
    expect(screen.getByRole('textbox', { name: 'Your explanation' }).value).toHaveLength(2000);
    expect(screen.getByRole('button', { name: 'Mark lesson reviewed' })).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY)).lessons.dry).toBeUndefined());
  });

  it('keeps a usable session when storage is malformed or blocked', async () => {
    localStorage.setItem(LESSON_STORAGE_KEY, '{');
    await openLesson();
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue({ setItem: () => { throw new Error('quota'); } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Your explanation' }), { target: { value: 'Keep this in the session' } });
    expect(screen.getByText(/Browser storage is unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Keep this in the session');
    fireEvent.click(screen.getByRole('button', { name: 'Mark lesson reviewed' }));
    expect(screen.getByRole('button', { name: 'Mark lesson not reviewed' })).toBeInTheDocument();
  });

  it('synchronizes valid cross-tab changes and removes its storage listener on departure', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    await openLesson();
    localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify({ lessons: { 'classes-and-objects': { notes: 'Updated in another tab', bookmarked: true } } }));
    fireEvent(window, new StorageEvent('storage', { key: LESSON_STORAGE_KEY }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Your explanation' })).toHaveValue('Updated in another tab'));
    fireEvent.click(screen.getByRole('link', { name: '← All lessons' }));
    expect(remove).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('does not overwrite notes saved by another tab between initialization and recording a visit', () => {
    const { result } = renderHook(() => useLessonProgress());
    localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify({ lessons: { 'classes-and-objects': { notes: 'Saved during mount', bookmarked: true } } }));
    act(() => result.current.visit('classes-and-objects'));
    expect(result.current.progress.lessons['classes-and-objects'].notes).toBe('Saved during mount');
    expect(JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY)).lessons['classes-and-objects'].bookmarked).toBe(true);
  });
});
