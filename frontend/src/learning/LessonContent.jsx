import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GITHUB_REPO_URL } from '../data/moduleSourceLinks';
import { CURRICULUM_GROUPS, LESSONS, PUBLISHED_LESSONS } from './curriculum';
import { useLessonProgress } from './useLessonProgress';

function CodeBlock({ title, children }) {
  return (
    <figure className="learn-code">
      <figcaption>{title}</figcaption>
      <pre role="region" tabIndex={0} aria-label={`${title}, scrollable code`}><code>{children.trim()}</code></pre>
    </figure>
  );
}

export default function LessonContent({ lesson, metadata }) {
  const heading = useRef(null);
  const [snapshotIndex, setSnapshotIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const { progress, notice, updateLesson, visit } = useLessonProgress();
  const saved = progress.lessons[lesson.id] || {};
  const snapshot = lesson.visual.snapshots[snapshotIndex];
  const index = PUBLISHED_LESSONS.findIndex(entry => entry.id === lesson.id);
  const previous = PUBLISHED_LESSONS[index - 1];
  const next = PUBLISHED_LESSONS[index + 1];
  const group = CURRICULUM_GROUPS.find(entry => entry.id === metadata.group);
  const nextPlanned = LESSONS.slice(LESSONS.findIndex(entry => entry.id === lesson.id) + 1)
    .find(entry => entry.status === 'planned');

  useEffect(() => {
    visit(lesson.id);
    heading.current?.focus();
  }, [lesson.id, visit]);

  return (
    <article className="learn-article">
      <header className="learn-hero">
        <p className="learn-eyebrow">{group.title.toUpperCase()} · {lesson.duration}</p>
        <h1 ref={heading} tabIndex={-1}>{metadata.title}</h1>
        <p>{lesson.summary}</p>
        <div className="learn-actions">
          <button type="button" aria-pressed={saved.bookmarked === true} onClick={() => updateLesson(lesson.id, { bookmarked: !saved.bookmarked })}>
            {saved.bookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
          </button>
          <a href="#lesson-exercise">Jump to practice ↓</a>
        </div>
        <p className="learn-muted">Prerequisites: {lesson.prerequisites}</p>
        {metadata.prerequisites.length > 0 && <nav className="learn-actions" aria-label="Prerequisite lessons">
          {metadata.prerequisites.map(id => {
            const prerequisite = LESSONS.find(entry => entry.id === id);
            return prerequisite.status === 'published'
              ? <Link key={id} to={`/learn/${id}`}>Review {prerequisite.title}</Link>
              : <span className="learn-muted" key={id}>{prerequisite.title} (planned)</span>;
          })}
        </nav>}
      </header>
      {notice && <p role="status" className="learn-callout">{notice}</p>}
      <nav aria-label="On this lesson" className="learn-section-links">
        <a href="#lesson-understand">Understand</a><a href="#lesson-visual">Visualize</a>
        <a href="#lesson-code">Read Java</a><a href="#lesson-exercise">Practise</a><a href="#lesson-review">Review</a>
      </nav>
      <section id="lesson-understand" aria-labelledby="understand-title">
        <h2 id="understand-title">Start with the problem</h2>
        <p className="learn-callout">{lesson.problem}</p>
        <h3>By the end, you can</h3>
        <ul>{lesson.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul>
        {lesson.explanation.map(section => <div key={section.title}><h3>{section.title}</h3><p>{section.text}</p></div>)}
      </section>
      <section id="lesson-visual" aria-labelledby="visual-title">
        <h2 id="visual-title">{lesson.visual.title}</h2>
        <p className="learn-muted">A recorded illustration verified against the Java example, not a live JVM or a memory-layout diagram. Choose a step to inspect its state.</p>
        <div className="learn-snapshot-controls" role="group" aria-label="Illustration steps">
          {lesson.visual.snapshots.map((entry, step) => (
            <button key={entry.title} type="button" aria-pressed={snapshotIndex === step} onClick={() => setSnapshotIndex(step)}>{step + 1}. {entry.title}</button>
          ))}
        </div>
        <figure className="learn-visual">
          <figcaption aria-live="polite">{snapshot.explanation}</figcaption>
          <div className="learn-object-grid">
            {snapshot.items.map(object => (
              <div className="learn-object" key={object.label}>
                {object.references?.length > 0 && <p><code>{object.references.join(' + ')}</code> →</p>}
                <h3>{object.label} : {object.typeLabel || lesson.visual.typeLabel}</h3>
                <dl>{object.fields.map(field => <div key={field.name} className="learn-field"><dt>{field.name}</dt><dd>{String(field.value)}</dd></div>)}</dl>
              </div>
            ))}
          </div>
          <p>{lesson.visual.summary}{lesson.visual.showReferenceCount && ` · ${snapshot.items.flatMap(object => object.references || []).length} references shown`}</p>
        </figure>
      </section>
      <section id="lesson-code" aria-labelledby="code-title">
        <h2 id="code-title">Read the Java, then predict</h2>
        <p>These are the actual source files compiled by the backend test suite, not a separately maintained code string. Save these files in one folder and run with JDK 17.</p>
        {lesson.code.map(block => <CodeBlock key={block.filename} title={block.filename}>{block.source}</CodeBlock>)}
        <CodeBlock title="Run locally">{lesson.run}</CodeBlock>
        <form className="learn-quiz" onSubmit={event => {
          event.preventDefault();
          setFeedback(lesson.quiz.options.find(option => option.id === answer)?.feedback || 'Choose one answer before checking.');
        }}>
          <fieldset>
            <legend>{lesson.quiz.prompt}</legend>
            {lesson.quiz.options.map(option => (
              <label key={option.id}>
                <input type="radio" name="prediction" value={option.id} checked={answer === option.id} onChange={() => { setAnswer(option.id); setFeedback(''); }} />
                {option.text}
              </label>
            ))}
          </fieldset>
          <button className="learn-primary" type="submit">Check prediction</button>
          <p role="status">{feedback}</p>
        </form>
        <details className="learn-disclosure">
          <summary>Compare with the Java output</summary>
          <CodeBlock title="Expected output, checked by Java tests">{lesson.output}</CodeBlock>
        </details>
      </section>
      <section id="lesson-exercise" aria-labelledby="exercise-title">
        <h2 id="exercise-title">Make the model your own</h2>
        <p>{lesson.exercise}</p>
        <label className="learn-notes">Your explanation
          <textarea value={saved.notes || ''} maxLength={2000} rows={7} onChange={event => updateLesson(lesson.id, { notes: event.target.value })} aria-describedby="lesson-notes-help" />
        </label>
        <p className="learn-muted" id="lesson-notes-help">{(saved.notes || '').length} / 2000 characters. Saved in this browser only. Do not enter personal or sensitive information. Notes are not graded or sent to a Java runner.</p>
        <details className="learn-disclosure"><summary>Self-check rubric</summary><ul>{lesson.rubric.map(point => <li key={point}>{point}</li>)}</ul></details>
      </section>
      <section aria-labelledby="pitfalls-title">
        <h2 id="pitfalls-title">Mistakes and limits</h2>
        <ul>{lesson.pitfalls.map(point => <li key={point}>{point}</li>)}</ul>
      </section>
      <section aria-labelledby="apply-title">
        <h2 id="apply-title">Apply it to a working system</h2>
        <p>{lesson.module.text}</p>
        <Link className="learn-link-button" to={lesson.module.path}>{lesson.module.title} →</Link>
        <details className="learn-disclosure"><summary>Inspect the verified module source</summary>
          <ul>{lesson.module.sources.map(path => <li key={path}><a href={`${GITHUB_REPO_URL}/blob/main/${path}`} target="_blank" rel="noopener noreferrer">{path}</a></li>)}</ul>
        </details>
      </section>
      <section id="lesson-review" aria-labelledby="review-title">
        <h2 id="review-title">Explain it without the diagram</h2>
        <ul>{lesson.summaryPoints.map(point => <li key={point}>{point}</li>)}</ul>
        <button type="button" className="learn-primary" aria-pressed={saved.reviewed === true} onClick={() => updateLesson(lesson.id, { reviewed: !saved.reviewed })}>
          {saved.reviewed ? 'Mark lesson not reviewed' : 'Mark lesson reviewed'}
        </button>
        <p role="status">{saved.reviewed ? 'Marked reviewed. This records your own review, not mastery or a test score.' : 'Mark reviewed when you have explained the example in your own words.'}</p>
        <nav aria-label="Lesson sequence" className="learn-actions">
          {previous && <Link to={`/learn/${previous.id}`}>← {previous.title}</Link>}
          {next ? <Link to={`/learn/${next.id}`}>Next: {next.title} →</Link> : <Link to="/learn">Back to lessons and roadmap →</Link>}
          <Link to="/learning-path">Continue with system practice →</Link>
        </nav>
        {nextPlanned && <p className="learn-muted">Next planned concept: {nextPlanned.title}. It is not published yet.</p>}
      </section>
      <section aria-labelledby="references-title">
        <h2 id="references-title">Further reading</h2>
        <p className="learn-muted">Official Java documentation. Tutorial pages may use Java 8-era examples; this lesson’s own example is checked with Java 17.</p>
        <ul>{lesson.references.map(reference => <li key={reference.url}><a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}</a></li>)}</ul>
      </section>
    </article>
  );
}
