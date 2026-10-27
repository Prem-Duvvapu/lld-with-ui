import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CURRICULUM_GROUPS, LESSONS, PUBLISHED_LESSONS, findLesson } from '../learning/curriculum';
import { useLessonProgress } from '../learning/useLessonProgress';
import { catalogPosition, rememberCatalog } from '../learning/catalogNavigation';
import '../learning/Learning.css';
import '../learning/LearnCatalog.css';

export default function Learn() {
  const heading = useRef(null);
  const bookmarkFilter = useRef(null);
  const searchInput = useRef(null);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { progress, notice, updateLesson } = useLessonProgress();
  const query = params.get('q') || '';
  const section = CURRICULUM_GROUPS.some(group => group.id === params.get('section')) ? params.get('section') : '';
  const review = ['reviewed', 'unreviewed'].includes(params.get('review')) ? params.get('review') : 'all';
  const bookmarksOnly = params.get('bookmarked') === '1';
  const alphabetical = params.get('sort') === 'alphabetical';
  const roadmap = params.get('view') === 'roadmap';
  const change = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });
  const clear = () => {
    setParams(roadmap ? { view: 'roadmap' } : {}, { replace: true });
    searchInput.current?.focus();
  };
  const resume = PUBLISHED_LESSONS.find(lesson => lesson.id === progress.lastLessonId) || PUBLISHED_LESSONS[0];
  const returning = resume?.id === progress.lastLessonId;
  const reviewed = PUBLISHED_LESSONS.filter(lesson => progress.lessons[lesson.id]?.reviewed).length;
  const nextLesson = PUBLISHED_LESSONS.find(lesson => !progress.lessons[lesson.id]?.reviewed && lesson.id !== (returning ? resume.id : null));
  const matches = lesson => {
    const group = CURRICULUM_GROUPS.find(entry => entry.id === lesson.group);
    const saved = progress.lessons[lesson.id];
    return `${lesson.title} ${group.title} ${lesson.outcome || ''}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!section || lesson.group === section) && (!bookmarksOnly || saved?.bookmarked) &&
      (review === 'all' || (lesson.status === 'published' && (review === 'reviewed' ? saved?.reviewed : !saved?.reviewed)));
  };
  const available = PUBLISHED_LESSONS.filter(matches);
  if (alphabetical) available.sort((a, b) => a.title.localeCompare(b.title));
  const planned = LESSONS.filter(lesson => lesson.status === 'planned' && matches(lesson));
  const groups = CURRICULUM_GROUPS.filter(group => roadmap || PUBLISHED_LESSONS.some(lesson => lesson.group === group.id));
  const activeFilters = Boolean(query || section || review !== 'all' || bookmarksOnly || alphabetical);
  const linkProps = (id, focusId) => ({
    to: `/learn/${id}`,
    state: { learnCatalog: { search: location.search, key: location.key, lessonId: id } },
    onClick: () => rememberCatalog(location.key, id, focusId),
  });

  useEffect(() => {
    // Run after the shared shell's route scroll reset. Browser Back and the
    // lesson breadcrumb both restore the originating card, without storage.
    const frame = requestAnimationFrame(() => {
      const position = catalogPosition(location.key) || catalogPosition(location.state?.learnCatalog?.key);
      const card = position && document.getElementById(position.focusId || `lesson-${position.lessonId}`);
      if (card) {
        card.focus({ preventScroll: true });
        window.scrollTo({ top: position.scrollY, behavior: 'instant' });
      } else heading.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
    // Restore on page entry only; typing/filter changes must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = lesson => {
    const saved = progress.lessons[lesson.id] || {};
    const group = CURRICULUM_GROUPS.find(entry => entry.id === lesson.group);
    return <article className="catalog-card" key={lesson.id} aria-labelledby={`title-${lesson.id}`}>
      <div className="catalog-card-meta"><span>{group.title}</span><span>{String(PUBLISHED_LESSONS.indexOf(lesson) + 1).padStart(2, '0')}</span></div>
      <h3 id={`title-${lesson.id}`}><Link id={`lesson-${lesson.id}`} {...linkProps(lesson.id)}>{lesson.title}</Link></h3>
      <p>{lesson.outcome || `Explore ${lesson.title.toLowerCase()} through working Java and a guided exercise.`}</p>
      {lesson.proposed && <span className="catalog-label">Proposed addition</span>}
      <p className="catalog-prerequisites">{lesson.prerequisites.length ? `Builds on: ${lesson.prerequisites.map(id => findLesson(id)?.title).join(', ')}` : 'Start here · No prerequisites'}</p>
      <div className="catalog-card-footer"><span>{lesson.duration}<br /><span className={saved.reviewed ? 'catalog-reviewed' : ''}>{saved.reviewed ? '✓ Reviewed' : 'Available'}</span></span>
        <button type="button" aria-label={saved.bookmarked ? `Remove bookmark for ${lesson.title}` : `Bookmark ${lesson.title}`} aria-pressed={saved.bookmarked === true} onClick={() => {
          updateLesson(lesson.id, { bookmarked: !saved.bookmarked });
          if (bookmarksOnly && saved.bookmarked) bookmarkFilter.current?.focus();
        }}>{saved.bookmarked ? '★ Saved' : '☆ Save'}</button>
      </div>
    </article>;
  };

  return <main className="learn-page learn-catalog-page">
    <nav aria-label="Learning navigation" className="learn-breadcrumb"><Link to="/">← Module library</Link><Link to="/learning-path">Practice systems →</Link></nav>
    <header className="catalog-hero">
      <div><p className="learn-eyebrow">YOUR LOW-LEVEL DESIGN JOURNEY</p><h1 ref={heading} tabIndex={-1}>Learn low-level<br /> design</h1><p className="catalog-intro">Learn low-level design through working Java, visual explanations, and decisions you can defend.</p>
        <p className="catalog-progress-label">{reviewed} of {PUBLISHED_LESSONS.length} available lessons marked reviewed</p><progress aria-label="Available lessons marked reviewed" max={PUBLISHED_LESSONS.length || 1} value={reviewed} /><p className="catalog-checklist-note">Your personal checklist, not a mastery score.</p>
      </div>
      {resume && <aside className="catalog-resume" aria-label={returning ? 'Continue learning' : 'Start learning'}><p className="learn-eyebrow">{returning ? 'PICK UP WHERE YOU LEFT OFF' : 'A GOOD PLACE TO BEGIN'}</p><h2>{resume.title}</h2><p>{resume.outcome || 'Read, inspect, predict, and explain.'}</p><span className="learn-muted">{resume.duration} · {returning ? 'Last opened lesson' : 'First in the guided sequence'}</span><Link id="catalog-primary" className="learn-primary" {...linkProps(resume.id, 'catalog-primary')}>{returning ? 'Continue learning →' : 'Start learning →'}</Link>
        {reviewed === PUBLISHED_LESSONS.length ? <p className="catalog-complete">All available lessons marked reviewed. Revisit a concept or <Link to="/learning-path">practise a system</Link>.</p> : nextLesson && nextLesson.id !== resume.id && <p className="catalog-next">Next unreviewed: <Link id="catalog-next" {...linkProps(nextLesson.id, 'catalog-next')}>{nextLesson.title}</Link></p>}
      </aside>}
    </header>
    {notice && <p role="status" className="learn-callout">{notice}</p>}
    <section aria-labelledby="learn-catalog-title" className="catalog-library">
      <div className="catalog-heading"><h2 id="learn-catalog-title">Find your next concept</h2><div className="catalog-views" role="group" aria-label="Catalog view"><button type="button" aria-pressed={!roadmap} onClick={() => change('view', '')}>Available lessons ({PUBLISHED_LESSONS.length})</button><button type="button" aria-pressed={roadmap} onClick={() => change('view', 'roadmap')}>Full roadmap ({LESSONS.length})</button></div></div>
      <div className="catalog-controls"><label className="learn-search">Search lessons<input ref={searchInput} type="search" value={query} onChange={event => change('q', event.target.value)} placeholder="Search a concept or learning outcome…" /></label><label>Sort lessons<select value={alphabetical ? 'alphabetical' : 'recommended'} onChange={event => change('sort', event.target.value === 'recommended' ? '' : event.target.value)}><option value="recommended">Recommended order</option><option value="alphabetical">Alphabetical</option></select></label></div>
      <div className="catalog-layout"><nav className="catalog-rail" aria-label="Curriculum sections"><p className="learn-eyebrow">EXPLORE THE CURRICULUM</p><button type="button" aria-current={!section ? 'true' : undefined} onClick={() => change('section', '')}>All sections</button>{groups.map(group => <button type="button" key={group.id} aria-current={section === group.id ? 'true' : undefined} onClick={() => change('section', group.id)}>{group.title}<span>{(roadmap ? LESSONS : PUBLISHED_LESSONS).filter(lesson => lesson.group === group.id).length}</span></button>)}</nav>
        <div className="catalog-results"><div className="catalog-filter-row"><label className="catalog-mobile-section">Section<select value={section} onChange={event => change('section', event.target.value)}><option value="">All sections</option>{CURRICULUM_GROUPS.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label><label>Review status<select value={review} onChange={event => change('review', event.target.value === 'all' ? '' : event.target.value)}><option value="all">Any review status</option><option value="unreviewed">Not reviewed</option><option value="reviewed">Reviewed</option></select></label><label className="learn-checkbox"><input ref={bookmarkFilter} type="checkbox" checked={bookmarksOnly} onChange={event => change('bookmarked', event.target.checked ? '1' : '')} /> Bookmarked only</label>{activeFilters && (available.length > 0 || (roadmap && planned.length > 0)) && <button type="button" className="catalog-clear" onClick={clear}>Clear lesson filters</button>}</div>
          <p role="status" className="catalog-result-count">{available.length} available lessons{roadmap && ` · ${planned.length} planned topics`}{section && ` · ${CURRICULUM_GROUPS.find(group => group.id === section).title}`}{query && ` matching “${query}”`}</p>
          {!available.length && !(roadmap && planned.length) && <div className="catalog-empty"><h3>No available lessons match</h3><p>{planned.length ? `${planned.length} matching topics are on the roadmap. They are not published yet.` : 'Try another search or clear your filters to explore the available lessons.'}</p>{planned.length > 0 && <button type="button" onClick={() => change('view', 'roadmap')}>View matching roadmap topics</button>}<button type="button" onClick={clear}>Clear lesson filters</button></div>}
          {!roadmap ? <div className="catalog-grid">{available.map(card)}</div> : CURRICULUM_GROUPS.map(group => {
            const ready = available.filter(lesson => lesson.group === group.id);
            const upcoming = planned.filter(lesson => lesson.group === group.id);
            if (!ready.length && !upcoming.length) return null;
            return <section className="catalog-roadmap-group" key={group.id} aria-labelledby={`group-${group.id}`}><h3 id={`group-${group.id}`}>{group.title}</h3><div className="catalog-grid">{ready.map(card)}</div>{upcoming.length > 0 && <details className="learn-roadmap" open={query.trim() ? true : undefined}><summary>{upcoming.length} planned topics — not published</summary><ul>{upcoming.map(lesson => <li key={lesson.id}><span>{lesson.title}</span>{lesson.proposed && <span className="catalog-label">Proposed addition</span>}<span className="learn-muted">Planned</span></li>)}</ul></details>}</section>;
          })}
        </div>
      </div>
    </section>
    <details className="catalog-about"><summary>About this curriculum & your saved progress</summary><p>{PUBLISHED_LESSONS.length} lessons are available now; {LESSONS.length - PUBLISHED_LESSONS.length} topics remain planned. Proposed additions are labelled, including those already published. Concurrency 101 groups the concurrency foundations.</p><p>Notes, bookmarks, and review marks stay in this browser. They do not sync across devices and are separate from module progress and its export. Reading estimates describe the whole lesson, not time remaining.</p><Link to="/learning-path">Put concepts into practice with complete systems →</Link></details>
  </main>;
}
