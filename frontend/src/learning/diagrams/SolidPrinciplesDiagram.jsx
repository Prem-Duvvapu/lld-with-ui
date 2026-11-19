import { useId, useState } from 'react';
import './SolidPrinciplesDiagram.css';

function Nodes({ nodes }) {
  return <ul className="solid-nodes">
    {nodes.map(node => <li key={node.id} className="solid-node">
      <strong>{node.title}</strong>
      {node.lines.length > 0 && <p className="solid-node-lines">{node.lines.join('\n')}</p>}
    </li>)}
  </ul>;
}

function Connections({ side, picture = false }) {
  // IDs are local to each before/after side; array order is authored, not execution order.
  const nodes = new Map(side.nodes.map(node => [node.id, node.title]));
  if (side.edges.length === 0) return <p>No arrows in this view.</p>;
  return <ul className={picture ? 'solid-arrows' : 'solid-connection-text'} aria-label="Connections">
    {side.edges.map((edge, index) => <li key={index}>
      <span className="solid-endpoint"><span className="solid-endpoint-label">From </span><strong>{nodes.get(edge.from)}</strong></span>
      <span className="solid-relation"><span className="solid-arrow" aria-hidden="true">→</span><span>{edge.label}</span></span>
      <span className="solid-endpoint"><span className="solid-endpoint-label">To </span><strong>{nodes.get(edge.to)}</strong></span>
    </li>)}
  </ul>;
}

function SidePicture({ side, stage, principleName }) {
  const titleId = useId(), captionId = useId();
  return <figure className={`solid-side solid-side-${stage.toLowerCase()}`} aria-labelledby={titleId} aria-describedby={captionId}>
    <h4 id={titleId}><span className="solid-stage">{stage}</span>{side.title}<span className="solid-sr-only"> — {principleName} responsibility diagram</span></h4>
    <Nodes nodes={side.nodes} />
    <Connections side={side} picture />
    <figcaption id={captionId}>{side.caption}</figcaption>
  </figure>;
}

function Contract({ principle }) {
  return <dl className="solid-contract">
    <div><dt>Contract to preserve</dt><dd>{principle.contract}</dd></div>
    <div><dt>Tradeoff</dt><dd>{principle.tradeoff}</dd></div>
  </dl>;
}

function PrincipleTranscript({ principle }) {
  const titleId = useId();
  return <section className="solid-transcript-principle" aria-labelledby={titleId}>
    <h4 id={titleId}>{principle.name}</h4>
    <p>{principle.question}</p>
    {['before', 'after'].map(stage => {
      const side = principle[stage];
      return <div className="solid-transcript-side" key={stage}>
        <h5>{stage === 'before' ? 'Before' : 'After'}: {side.title}</h5>
        <Nodes nodes={side.nodes} />
        <Connections side={side} />
        <p>{side.caption}</p>
      </div>;
    })}
    <Contract principle={principle} />
    <p className="solid-sources-label"><strong>Sources</strong></p>
    <ul className="solid-sources">{principle.sourcePaths.map((path, index) => <li key={index}><code>{path}</code></li>)}</ul>
  </section>;
}

// Authored principles schema: all five IDs, string content, side-local node IDs,
// and directed edges whose from/to IDs resolve within that same side.
export default function SolidPrinciplesDiagram({ model }) {
  const titleId = useId(), selectId = useId(), helpId = useId(), selectedTitleId = useId(), transcriptId = useId();
  const [view, setView] = useState({ model, id: model.principles[0].id });
  // Reset even if a replacement model reuses all IDs, or the previous model returns.
  // Keeping this local avoids effects, focus movement, and page/storage mutations.
  if (view.model !== model) setView({ model, id: model.principles[0].id });
  const selected = model.principles.find(principle => view.model === model && principle.id === view.id) || model.principles[0];

  return <section className="lesson-solid" aria-labelledby={titleId}>
    <h2 id={titleId}>{model.title}</h2>
    <p>{model.summary}</p>
    <p className="solid-reading-guide">These are conceptual responsibility and contract views, not UML diagrams, object snapshots or execution. Arrows show the labelled relationship from one named endpoint to another; their position does not establish call order.</p>
    <label className="solid-selector" htmlFor={selectId}>SOLID principle
      <select id={selectId} value={selected.id} aria-describedby={helpId} onChange={event => setView({ model, id: event.target.value })}>
        {model.principles.map(principle => <option value={principle.id} key={principle.id}>{principle.name}</option>)}
      </select>
    </label>
    <p id={helpId}>Choose a principle to compare before and after. The complete text explanation below always includes all five principles.</p>
    <p className="solid-sr-only" role="status">Showing {selected.name}: before and after.</p>
    <section className="solid-selected" aria-labelledby={selectedTitleId}>
      <h3 id={selectedTitleId}>{selected.name}</h3>
      <p className="solid-question">{selected.question}</p>
      <div className="solid-comparison">
        <SidePicture side={selected.before} stage="Before" principleName={selected.name} />
        <SidePicture side={selected.after} stage="After" principleName={selected.name} />
      </div>
      <Contract principle={selected} />
    </section>
    <section className="solid-transcript" aria-labelledby={transcriptId}>
      <h3 id={transcriptId}>Complete text explanation — all five principles</h3>
      <details className="solid-transcript-details">
        <summary>Read all five principles as text</summary>
        <p>Every responsibility, arrow, contract, tradeoff and source is retained here when the selected picture changes.</p>
        {model.principles.map(principle => <PrincipleTranscript key={principle.id} principle={principle} />)}
        <h4>Reading notes</h4>
        <ul className="solid-notes">{model.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
      </details>
    </section>
  </section>;
}
