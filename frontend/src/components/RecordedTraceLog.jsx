import { useState } from 'react';
import './RecordedTrace.css';

const PAGE_SIZE = 25;

export default function RecordedTraceLog({ trace, position, describeEvent }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(trace.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const first = currentPage * PAGE_SIZE;
  return (
    <details className="simulation-panel-card recorded-trace-log" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>Full backend recording · {trace.length} events</summary>
      {expanded && <>
        <p>Recorded order is preserved. Applied and upcoming events are labelled; replay does not rerun any thread.</p>
        <div className="recorded-trace-pagination">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>Previous log page</button>
          <span>Page {currentPage + 1} of {pages}</span>
          <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage + 1 >= pages}>Next log page</button>
          <button type="button" onClick={() => setPage(Math.floor(Math.max(0, position - 1) / PAGE_SIZE))} disabled={!trace.length}>Current event page</button>
        </div>
        {trace.length ? <ol start={first + 1}>{trace.slice(first, first + PAGE_SIZE).map((event, offset) => <li key={event.sequence} aria-current={first + offset + 1 === position ? 'step' : undefined}>
          <strong>{first + offset + 1 === position ? 'Current' : first + offset < position ? 'Applied' : 'Upcoming'}</strong> · {describeEvent(event)}
        </li>)}</ol> : <p>This recording contains no events.</p>}
      </>}
    </details>
  );
}
