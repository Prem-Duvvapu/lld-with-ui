// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Learn from '../pages/Learn';
import Lesson from '../pages/Lesson';
import { LESSONS, PUBLISHED_LESSONS } from '../learning/curriculum';
import { LESSON_STORAGE_KEY, useLessonProgress } from '../learning/useLessonProgress';
import { loadLesson } from '../learning/lessonLoader';

vi.mock('../learning/lessonLoader', () => ({ loadLesson: vi.fn() }));

function renderCatalog(path = '/learn', previous = []) {
  const router = createMemoryRouter([
    { path: '/learn', element: <Learn /> },
    { path: '/learn/:lessonId', element: <Lesson /> },
    { path: '/before', element: <h1>Before catalog</h1> },
  ], { initialEntries: [...previous, path], initialIndex: previous.length });
  render(<RouterProvider router={router} />);
  return router;
}

function saveProgress(lessons, lastLessonId = null) {
  localStorage.setItem(LESSON_STORAGE_KEY, JSON.stringify({ lessons, lastLessonId }));
}

function cardTitles() {
  return screen.queryAllByRole('article').map(card => within(card).getByRole('heading').textContent);
}

function change(name, value) {
  fireEvent.change(screen.getByRole(name === 'Search lessons' ? 'searchbox' : 'combobox', { name }), { target: { value } });
}

function expectCount(count) {
  expect(screen.getByRole('status')).toHaveTextContent(`${count} available lessons`);
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  loadLesson.mockReset().mockImplementation(() => new Promise(() => {}));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(cleanup);

describe('Learning catalog discovery', () => {
  it('starts with published lessons in prerequisite order and a clearly named start action', () => {
    renderCatalog();
    expect(screen.getByRole('button', { name: 'Available lessons (16)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Full roadmap (69)' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('link', { name: 'Start learning →' })).toHaveAttribute('href', '/learn/how-to-learn-lld');
    expect(screen.getByText(/0 of 16 available lessons marked reviewed/)).toBeVisible();
    expectCount(16);
    expect(cardTitles()).toEqual(PUBLISHED_LESSONS.map(lesson => lesson.title));
    for (const lesson of PUBLISHED_LESSONS) {
      const card = screen.getByRole('article', { name: lesson.title });
      expect(within(card).getByRole('link', { name: lesson.title, exact: true })).toHaveAttribute('href', `/learn/${lesson.id}`);
      expect(within(card).getByText(lesson.duration, { exact: false })).toBeVisible();
      expect(within(card).getByRole('button', { name: `Bookmark ${lesson.title}` }).closest('a')).toBeNull();
    }
    expect(screen.queryByRole('link', { name: 'DRY Principle', exact: true })).not.toBeInTheDocument();
    expect(loadLesson).not.toHaveBeenCalled();
  });

  it('combines section, review and bookmark filters and clears an empty result without losing search focus', () => {
    saveProgress({
      enums: { reviewed: true, bookmarked: true },
      interfaces: { reviewed: false, bookmarked: true },
      association: { reviewed: true, bookmarked: true },
    });
    renderCatalog();
    change('Section', 'oop');
    change('Review status', 'reviewed');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bookmarked only' }));
    expect(cardTitles()).toEqual(['Enums']);
    expectCount(1);
    expect(within(screen.getByRole('article', { name: 'Enums' })).getByText(/^(?:✓ )?Reviewed$/)).toBeVisible();
    change('Review status', 'unreviewed');
    expect(cardTitles()).toEqual(['Interfaces']);
    const search = screen.getByRole('searchbox', { name: 'Search lessons' });
    search.focus();
    change('Search lessons', 'nothing matches this');
    expect(search).toHaveFocus();
    expectCount(0);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Clear lesson filters' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Review status' })).toHaveValue('all');
    expect(screen.getByRole('checkbox', { name: 'Bookmarked only' })).not.toBeChecked();
    expectCount(16);
  });

  it('searches section metadata and lesson outcomes as well as titles', () => {
    renderCatalog();
    change('Search lessons', 'Class relationships');
    expect(cardTitles()).toEqual(['Association', 'Aggregation', 'Composition', 'Dependency']);
    const lesson = PUBLISHED_LESSONS.find(entry => entry.id === 'encapsulation');
    expect(lesson.outcome).toEqual(expect.any(String));
    expect(lesson.outcome.length).toBeGreaterThan(20);
    change('Search lessons', lesson.outcome);
    expect(screen.getByRole('article', { name: 'Encapsulation' })).toBeVisible();
    expect(loadLesson).not.toHaveBeenCalled();
  });

  it('sorts alphabetically and restores the canonical recommended sequence', () => {
    const router = renderCatalog();
    change('Sort lessons', 'alphabetical');
    expect(cardTitles()).toEqual(PUBLISHED_LESSONS.map(lesson => lesson.title).sort((a, b) => a.localeCompare(b)));
    expect(new URLSearchParams(router.state.location.search).get('sort')).toBe('alphabetical');
    change('Sort lessons', 'recommended');
    expect(cardTitles()).toEqual(PUBLISHED_LESSONS.map(lesson => lesson.title));
    expect(new URLSearchParams(router.state.location.search).has('sort')).toBe(false);
  });

  it('offers planned-only search results in an explicitly labelled roadmap without lesson links', () => {
    const router = renderCatalog();
    change('Search lessons', 'SOLID');
    expectCount(0);
    fireEvent.click(screen.getByRole('button', { name: 'View matching roadmap topics' }));
    expect(screen.getByRole('button', { name: 'Full roadmap (69)' })).toHaveAttribute('aria-pressed', 'true');
    expect(new URLSearchParams(router.state.location.search).get('view')).toBe('roadmap');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('SOLID');
    for (const title of ['SOLID Principles with Pictures', 'SOLID Principles with Code']) {
      expect(screen.getByText(title, { exact: true })).toBeVisible();
      expect(screen.queryByRole('link', { name: title, exact: true })).not.toBeInTheDocument();
    }
    expect(screen.getAllByText(/planned.*not published/i).length).toBeGreaterThan(0);
    expect(loadLesson).not.toHaveBeenCalled();
  });

  it('moves keyboard focus to search when clearing filters removes the clear button', () => {
    renderCatalog('/learn?q=no-matching-title');
    const clear = screen.getByRole('button', { name: 'Clear lesson filters' });
    clear.focus();
    fireEvent.click(clear);
    expect(screen.getByRole('searchbox', { name: 'Search lessons' })).toHaveFocus();
    expectCount(16);
  });

  it('preserves a selected roadmap section on switching views and lets Clear recover the empty available view', () => {
    const router = renderCatalog('/learn?view=roadmap&section=principles');
    fireEvent.click(screen.getByRole('button', { name: 'Available lessons (16)' }));
    expect(screen.getByRole('combobox', { name: 'Section' })).toHaveValue('principles');
    expectCount(0);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(new URLSearchParams(router.state.location.search).get('section')).toBe('principles');
    expect(new URLSearchParams(router.state.location.search).has('view')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Clear lesson filters' }));
    expect(screen.getByRole('combobox', { name: 'Section' })).toHaveValue('');
    expectCount(16);
    expect(router.state.location.search).toBe('');
  });

  it('preserves proposed-addition labels for both available and planned roadmap topics', () => {
    renderCatalog('/learn?view=roadmap&q=constructors');
    const card = screen.getByRole('article', { name: 'Constructors and Initialization' });
    expect(within(card).getByText('Proposed addition')).toBeVisible();
    expect(within(card).getByText('Available', { exact: true })).toBeVisible();
    change('Search lessons', 'Interpreter');
    expect(screen.getByText('Interpreter', { exact: true })).toBeVisible();
    expect(screen.getByText('Proposed addition')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Interpreter', exact: true })).not.toBeInTheDocument();
    expect(loadLesson).not.toHaveBeenCalled();
  });
});

describe('Learning catalog continuity', () => {
  it('hydrates all shareable filters from the URL and replaces history when editing them', async () => {
    saveProgress({ enums: { reviewed: true, bookmarked: true } });
    const router = renderCatalog('/learn?q=enum&section=oop&review=reviewed&bookmarked=1&sort=alphabetical', ['/before']);
    expect(screen.getByRole('searchbox', { name: 'Search lessons' })).toHaveValue('enum');
    expect(screen.getByRole('combobox', { name: 'Section' })).toHaveValue('oop');
    expect(screen.getByRole('combobox', { name: 'Review status' })).toHaveValue('reviewed');
    expect(screen.getByRole('checkbox', { name: 'Bookmarked only' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Sort lessons' })).toHaveValue('alphabetical');
    expect(cardTitles()).toEqual(['Enums']);
    change('Search lessons', 'interfaces');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('interfaces');
    fireEvent.click(screen.getByRole('button', { name: 'Clear lesson filters' }));
    expect(router.state.location.search).toBe('');
    expectCount(16);
    await act(() => router.navigate(-1));
    await screen.findByRole('heading', { name: 'Before catalog' });
  });

  it('bookmarks in place while preserving notes, reviewed marks, resume and module progress', () => {
    const saved = { notes: 'private notes: keep & preserve', reviewed: true, bookmarked: false };
    saveProgress({ enums: saved, association: { notes: 'Other lesson notes', reviewed: false, bookmarked: true } }, 'association');
    localStorage.setItem('lld-progress-v1', JSON.stringify({ parking: 123 }));
    const router = renderCatalog('/learn?q=enum');
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark Enums' }));
    let stored = JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY));
    expect(stored.lessons.enums).toEqual({ ...saved, bookmarked: true });
    expect(stored.lessons.association.notes).toBe('Other lesson notes');
    expect(stored.lastLessonId).toBe('association');
    expect(router.state.location.pathname).toBe('/learn');
    expect(router.state.location.search).toBe('?q=enum');
    fireEvent.click(screen.getByRole('button', { name: 'Remove bookmark for Enums' }));
    stored = JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY));
    expect(stored.lessons.enums).toEqual(saved);
    expect(JSON.parse(localStorage.getItem('lld-progress-v1'))).toEqual({ parking: 123 });
    expect(loadLesson).not.toHaveBeenCalled();
  });

  it('preserves notes saved by another tab immediately before a catalog bookmark', () => {
    saveProgress({ enums: { notes: 'Original', reviewed: false } });
    renderCatalog('/learn?q=enum');
    // No storage event has reached this tab yet: the action must merge the latest saved record.
    saveProgress({ enums: { notes: 'Newer notes', reviewed: true }, association: { notes: 'Also new' } }, 'association');
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark Enums' }));
    const stored = JSON.parse(localStorage.getItem(LESSON_STORAGE_KEY));
    expect(stored.lessons.enums).toEqual({ notes: 'Newer notes', reviewed: true, bookmarked: true });
    expect(stored.lessons.association.notes).toBe('Also new');
    expect(stored.lastLessonId).toBe('association');
  });

  it('returns focus to the bookmark filter when removing its last visible bookmarked card', () => {
    saveProgress({ enums: { bookmarked: true } });
    renderCatalog('/learn?bookmarked=1');
    const remove = screen.getByRole('button', { name: 'Remove bookmark for Enums' });
    remove.focus();
    fireEvent.click(remove);
    expect(screen.queryByRole('article', { name: 'Enums' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Bookmarked only' })).toHaveFocus();
    expectCount(0);
  });

  it('preserves unsaved notes and their warning when another tab emits a storage event', () => {
    const stale = JSON.stringify({ lessons: { enums: { notes: 'Old saved notes' } } });
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue({
      getItem: () => stale,
      setItem: () => { throw new Error('quota'); },
    });
    const { result } = renderHook(() => useLessonProgress());
    act(() => result.current.updateLesson('enums', { notes: 'Unsaved draft to preserve' }));
    fireEvent(window, new StorageEvent('storage', { key: LESSON_STORAGE_KEY, newValue: stale }));
    expect(result.current.progress.lessons.enums.notes).toBe('Unsaved draft to preserve');
    expect(result.current.notice).toMatch(/not saved|unsaved/i);
  });

  it('keeps bookmark feedback usable and exposes a failed save', () => {
    renderCatalog('/learn?q=enum');
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue({
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark Enums' }));
    expect(screen.getByRole('button', { name: 'Remove bookmark for Enums' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Browser storage is unavailable/)).toBeVisible();
    expect(loadLesson).not.toHaveBeenCalled();
  });

  it('retains unsaved session notes when bookmarking after a failed write and a successful stale read', () => {
    const stale = JSON.stringify({ lessons: { enums: { notes: 'Old saved notes', reviewed: true } }, lastLessonId: 'enums' });
    const write = vi.fn().mockImplementationOnce(() => { throw new Error('quota'); });
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue({ getItem: () => stale, setItem: write });
    const { result } = renderHook(() => useLessonProgress());
    act(() => result.current.updateLesson('enums', { notes: 'New unsaved notes' }));
    expect(result.current.notice).toMatch(/Browser storage is unavailable/);
    act(() => result.current.updateLesson('enums', { bookmarked: true }));
    expect(result.current.progress.lessons.enums).toEqual({ notes: 'New unsaved notes', reviewed: true, bookmarked: true });
    expect(JSON.parse(write.mock.lastCall[1]).lessons.enums.notes).toBe('New unsaved notes');
    expect(result.current.notice).toBe('');
  });

  it('names the last visited lesson and offers continuation even when all published lessons are reviewed', () => {
    saveProgress(Object.fromEntries(PUBLISHED_LESSONS.map(lesson => [lesson.id, { reviewed: true }])), 'interfaces');
    renderCatalog();
    const resume = screen.getByRole('link', { name: 'Continue learning →' });
    expect(resume).toHaveAttribute('href', '/learn/interfaces');
    expect(screen.getAllByText('Interfaces', { exact: true }).length).toBeGreaterThan(1);
    expect(screen.getByText(/16 of 16 available lessons marked reviewed/)).toBeVisible();
    expect(screen.queryByRole('link', { name: /Next unreviewed/ })).not.toBeInTheDocument();
    expect(cardTitles()).toHaveLength(PUBLISHED_LESSONS.length);
    expect(screen.queryByText(/69 of 69|curriculum complete|mastered all/i)).not.toBeInTheDocument();
  });

  it.each(['breadcrumb', 'browser Back'])('restores catalog query, scroll and focus using %s', async returnMethod => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(420);
    const query = '?q=enum&section=oop&sort=alphabetical';
    const router = renderCatalog(`/learn${query}`);
    fireEvent.click(screen.getByRole('link', { name: 'Enums', exact: true }));
    expect(router.state.location.state.learnCatalog).toEqual({ search: query, lessonId: 'enums', key: expect.any(String) });
    expect(loadLesson).toHaveBeenCalledWith('enums');
    if (returnMethod === 'breadcrumb') fireEvent.click(screen.getByRole('link', { name: '← All lessons' }));
    else await act(() => router.navigate(-1));
    expect(router.state.location.search).toBe(query);
    expect(screen.getByRole('searchbox', { name: 'Search lessons' })).toHaveValue('enum');
    expect(cardTitles()).toEqual(['Enums']);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Enums', exact: true })).toHaveFocus());
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 420 }));
  });

  it.each(['primary', 'next'])('restores the originating %s hero action instead of an offscreen lesson card', async action => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
    if (action === 'next') saveProgress({}, 'enums');
    renderCatalog();
    const source = () => action === 'primary'
      ? screen.getByRole('link', { name: 'Start learning →' })
      : within(screen.getByRole('complementary', { name: 'Continue learning' })).getByRole('link', { name: 'How to Learn LLD', exact: true });
    fireEvent.click(source());
    fireEvent.click(screen.getByRole('link', { name: '← All lessons' }));
    await waitFor(() => expect(source()).toHaveFocus());
    expect(window.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 0 }));
  });

  it('restores the latest departure after a breadcrumb return followed by browser Back', async () => {
    const scroll = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(120);
    const router = renderCatalog();
    fireEvent.click(within(screen.getByRole('article', { name: 'Enums' })).getByRole('link', { name: 'Enums' }));
    fireEvent.click(screen.getByRole('link', { name: '← All lessons' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Enums', exact: true })).toHaveFocus());
    scroll.mockReturnValue(880);
    fireEvent.click(within(screen.getByRole('article', { name: 'Association' })).getByRole('link', { name: 'Association' }));
    window.scrollTo.mockClear();
    await act(() => router.navigate(-1));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Association', exact: true })).toHaveFocus());
    expect(window.scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 880 }));
  });

  it('keeps the original catalog context through next and prerequisite reading links', async () => {
    loadLesson.mockImplementation(id => {
      if (id === 'classes-and-objects') return import('../learning/lessons/classes-and-objects').then(module => module.default);
      if (id === 'constructors') return import('../learning/lessons/constructors').then(module => module.default);
      throw new Error(`Unexpected lesson: ${id}`);
    });
    const query = '?q=objects&section=oop';
    const router = renderCatalog(`/learn${query}`);
    fireEvent.click(within(screen.getByRole('article', { name: 'Classes and Objects' })).getByRole('link', { name: 'Classes and Objects' }));
    const context = router.state.location.state.learnCatalog;
    await screen.findByRole('heading', { name: 'Classes and Objects', level: 1 });
    fireEvent.click(screen.getByRole('link', { name: 'Next: Constructors and Initialization →' }));
    await screen.findByRole('heading', { name: 'Constructors and Initialization', level: 1 });
    expect(router.state.location.state.learnCatalog).toEqual(context);
    fireEvent.click(screen.getByRole('link', { name: 'Review Classes and Objects' }));
    await screen.findByRole('heading', { name: 'Classes and Objects', level: 1 });
    expect(router.state.location.state.learnCatalog).toEqual(context);
    fireEvent.click(screen.getByRole('link', { name: '← All lessons' }));
    expect(router.state.location.search).toBe(query);
    await waitFor(() => expect(within(screen.getByRole('article', { name: 'Classes and Objects' })).getByRole('link', { name: 'Classes and Objects' })).toHaveFocus());
  });

  it('does not load any lesson content while browsing the full roadmap and changing filters', () => {
    renderCatalog();
    fireEvent.click(screen.getByRole('button', { name: `Full roadmap (${LESSONS.length})` }));
    change('Search lessons', 'concurrency');
    change('Section', 'concurrency-basics');
    change('Sort lessons', 'alphabetical');
    fireEvent.click(screen.getByRole('button', { name: 'Clear lesson filters' }));
    expect(loadLesson).not.toHaveBeenCalled();
  });
});
