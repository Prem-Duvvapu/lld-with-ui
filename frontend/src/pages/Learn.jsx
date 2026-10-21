import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CURRICULUM_GROUPS, LESSONS, PUBLISHED_LESSONS, findLesson } from '../learning/curriculum';
import { useLessonProgress } from '../learning/useLessonProgress';
import '../learning/Learning.css';

export default function Learn() {
  const heading = useRef(null);
  const [query, setQuery] = useState('');
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const { progress, notice } = useLessonProgress();
  const resume = findLesson(progress.lastLessonId) || PUBLISHED_LESSONS[0];
  const reviewed = PUBLISHED_LESSONS.filter(lesson => progress.lessons[lesson.id]?.reviewed).length;
  const filtered = LESSONS.filter(lesson => {
    const group = CURRICULUM_GROUPS.find(entry => entry.id === lesson.group);
    return `${lesson.title} ${group.title}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!bookmarksOnly || progress.lessons[lesson.id]?.bookmarked);
  });

  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <main className="learn-page">
      <nav aria-label="Learning navigation" className="learn-breadcrumb"><Link to="/">← Module library</Link><Link to="/learning-path">Practice systems →</Link></nav>
      <header className="learn-hero">
        <p className="learn-eyebrow">UNDERSTAND · EXPERIMENT · EXPLAIN</p>
        <h1 ref={heading} tabIndex={-1}>Learn low-level design</h1>
        <p>Start with objects, not a list of patterns. Build a mental model, read working Java, and explain your decisions before practising a complete system.</p>
        <div className="learn-actions"><Link className="learn-primary" to={`/learn/${resume.id}`}>{progress.lastLessonId ? 'Resume learning' : 'Start with Classes and Objects'} →</Link></div>
        <p className="learn-muted">{reviewed} of {PUBLISHED_LESSONS.length} published lessons marked reviewed. This is a personal checklist, not a mastery score.</p>
      </header>
      <aside className="learn-callout" aria-label="Curriculum availability">
        <strong>One complete lesson is available now.</strong>
        <p>The remaining topics below are a transparent roadmap, not empty lesson pages. Proposed additions are labelled. Concurrency 101 is the overview for the concurrency foundations, not a duplicate introduction.</p>
        <p>Lesson notes, bookmarks, and review marks stay in this browser, separately from module progress. They do not sync across devices and are not included in the module progress export.</p>
      </aside>
      {notice && <p role="status" className="learn-callout">{notice}</p>}
      <section className="learn-catalog" aria-labelledby="learn-catalog-title">
        <h2 id="learn-catalog-title">Find your next concept</h2>
        <div className="learn-filters">
          <label className="learn-search">Search lessons<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try objects, SOLID, or concurrency" /></label>
          <label className="learn-checkbox"><input type="checkbox" checked={bookmarksOnly} onChange={event => setBookmarksOnly(event.target.checked)} /> Bookmarked only</label>
        </div>
        <p role="status">{filtered.length} topics match. {filtered.filter(lesson => lesson.status === 'published').length} available to open.</p>
        {!filtered.length && <div className="learn-callout"><p>No matching topics. Try a broader search or show all lessons.</p><button type="button" onClick={() => { setQuery(''); setBookmarksOnly(false); }}>Clear lesson filters</button></div>}
        {CURRICULUM_GROUPS.map(group => {
          const lessons = filtered.filter(lesson => lesson.group === group.id);
          if (!lessons.length) return null;
          const available = lessons.filter(lesson => lesson.status === 'published');
          return (
            <section key={group.id} className="learn-group" aria-labelledby={`group-${group.id}`}>
              <h3 id={`group-${group.id}`}>{group.title}</h3>
              {available.map(lesson => <Link className="learn-lesson-card" key={lesson.id} to={`/learn/${lesson.id}`}><span><strong>{lesson.title}</strong><small>Read → inspect → predict → explain · 15–20 minutes</small></span><span>{progress.lessons[lesson.id]?.reviewed ? 'Reviewed' : 'Available'} →</span></Link>)}
              {lessons.some(lesson => lesson.status === 'planned') && <details className="learn-roadmap" open={Boolean(query.trim())}><summary>{lessons.filter(lesson => lesson.status === 'planned').length} planned topics — not published</summary><ul>{lessons.filter(lesson => lesson.status === 'planned').map(lesson => <li key={lesson.id}>{lesson.title}{lesson.proposed && <span className="learn-tag">Proposed addition</span>}</li>)}</ul></details>}
            </section>
          );
        })}
      </section>
    </main>
  );
}
