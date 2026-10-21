import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findLesson } from '../learning/curriculum';
import { loadLesson } from '../learning/lessonLoader';
import LessonContent from '../learning/LessonContent';
import '../learning/Learning.css';

export default function Lesson() {
  const { lessonId } = useParams();
  const metadata = findLesson(lessonId);
  const fallbackHeading = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (metadata?.status !== 'published') return;
    let active = true;
    loadLesson(lessonId).then(lesson => {
      if (active) setResult({ id: lessonId, lesson });
    }).catch(() => {
      if (active) setResult({ id: lessonId, error: true });
    });
    return () => { active = false; };
  }, [lessonId, metadata]);

  const current = result?.id === lessonId ? result : null;

  useEffect(() => { fallbackHeading.current?.focus(); }, [lessonId, current?.error]);

  let body;
  if (!metadata) {
    body = <section className="learn-callout">
      <h1 ref={fallbackHeading} tabIndex={-1}>Lesson not found</h1>
      <p>This address does not match the curriculum. Choose a published lesson from the catalog.</p>
      <Link to="/learn">Find a lesson →</Link>
    </section>;
  } else if (metadata.status !== 'published') {
    body = <section className="learn-callout">
      <h1 ref={fallbackHeading} tabIndex={-1}>{metadata.title}</h1>
      <p>This topic is planned, not published. There is no completed lesson at this address yet.</p>
      <Link to="/learn/classes-and-objects">Start with Classes and Objects →</Link>
    </section>;
  } else if (current?.error) {
    body = <section className="learn-callout" role="alert">
      <h1 ref={fallbackHeading} tabIndex={-1}>Could not load this lesson</h1>
      <p>Your saved notes and progress have not been changed. Reload to fetch a fresh copy of the lesson, or return to the catalog.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload lesson</button>
    </section>;
  } else if (current?.lesson) {
    body = <LessonContent key={lessonId} metadata={metadata} lesson={current.lesson} />;
  } else {
    body = <p role="status">Loading lesson…</p>;
  }

  return (
    <main className="learn-page">
      <nav aria-label="Learning navigation" className="learn-breadcrumb"><Link to="/learn">← All lessons</Link><Link to="/">Module library</Link></nav>
      {body}
    </main>
  );
}
