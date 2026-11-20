import { useId, useState } from 'react';
import DiagramViewer from '../../components/DiagramViewer';
import './LessonActivityDiagram.css';

function EdgeText({ edge, nodes }) {
  return <>
    <strong>{nodes.get(edge.from).label} → {nodes.get(edge.to).label}</strong>
    <p>{edge.guard ? `Guard: [${edge.guard}]` : 'Unguarded control flow.'} {edge.description}</p>
    <p>Source: <code>{edge.source}</code></p>
  </>;
}

// IDs belong to each SVG instance, including separate inline/fullscreen viewers.
function Canvas({ model, selected }) {
  const prefix = `activity-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <svg className="activity-canvas" width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} aria-hidden="true" focusable="false">
    <defs><marker id={`${prefix}-arrow`} viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
      <path d="M1 1 L11 6 L1 11" fill="none" stroke="currentColor" strokeWidth="2" />
    </marker></defs>
    {model.edges.map(edge => <g key={edge.id} data-edge={edge.id} data-from={edge.from} data-to={edge.to} data-selected={selected === edge.id ? 'true' : 'false'}>
      <polyline className="activity-edge" points={edge.points.map(point => point.join(',')).join(' ')} fill="none" markerEnd={`url(#${prefix}-arrow)`} />
      {edge.guard && <g className="activity-guard">
        <rect x={edge.labelPosition.x - 70} y={edge.labelPosition.y - 17} width="140" height="26" rx="4" />
        <text x={edge.labelPosition.x} y={edge.labelPosition.y} textAnchor="middle">[{edge.guard}]</text>
      </g>}
    </g>)}
    {model.nodes.map(node => <g key={node.id} data-node={node.id} data-kind={node.kind}>
      {node.kind === 'initial' && <circle className="activity-solid" cx={node.x} cy={node.y} r="12" />}
      {node.kind === 'activity-final' && <><circle className="activity-hollow" cx={node.x} cy={node.y} r="20" /><circle className="activity-solid" cx={node.x} cy={node.y} r="12" /></>}
      {node.kind === 'action' && <rect className="activity-hollow" x={node.x - 120} y={node.y - 30} width="240" height="60" rx="18" />}
      {['decision', 'merge'].includes(node.kind) && <polygon className="activity-hollow" points={(node.kind === 'decision' ? [[0, -48], [48, 0], [0, 48], [-48, 0]] : [[0, -22], [22, 0], [0, 22], [-22, 0]]).map(([x, y]) => `${node.x + x},${node.y + y}`).join(' ')} />}
      <text className={node.kind === 'decision' ? 'activity-decision-label' : undefined} x={node.kind === 'merge' ? node.x + 40 : ['initial', 'activity-final'].includes(node.kind) ? node.x + 32 : node.x} y={node.kind === 'merge' ? node.y + 40 : node.y + 5} textAnchor={['initial', 'activity-final', 'merge'].includes(node.kind) ? 'start' : 'middle'}>{node.label}</text>
    </g>)}
  </svg>;
}

export default function LessonActivityDiagram({ model }) {
  const titleId = useId(), selectId = useId(), helpId = useId();
  const [view, setView] = useState({ model, selected: '' });
  if (view.model !== model) setView({ model, selected: '' });
  const selected = view.model === model ? model.edges.find(edge => edge.id === view.selected) : null;
  const nodes = new Map(model.nodes.map(node => [node.id, node]));
  const transcript = <>
    <p>{model.summary}</p>
    <h4>All activity nodes</h4>
    <ol>{model.nodes.map(node => <li key={node.id}>
      <strong>{node.label} — {node.kind}</strong><p>{node.description}</p><p>Source: <code>{node.source}</code></p>
    </li>)}</ol>
    <h4>All control flows and guards</h4>
    <ul>{model.edges.map(edge => <li key={edge.id}><EdgeText edge={edge} nodes={nodes} /></li>)}</ul>
    <h4>Notation and limits</h4><ul>{model.notes.map(note => <li key={note}>{note}</li>)}</ul>
  </>;
  return <section className="lesson-activity" aria-labelledby={titleId}>
    <h2 id={titleId}>{model.title}</h2><p>{model.summary}</p>
    <label className="activity-selector" htmlFor={selectId}>Activity control flow
      <select id={selectId} aria-describedby={helpId} value={selected?.id || ''} onChange={event => setView({ model, selected: event.target.value })}>
        <option value="">All control flows</option>
        {model.edges.map(edge => <option key={edge.id} value={edge.id}>{nodes.get(edge.from).label} → {nodes.get(edge.to).label}{edge.guard ? ` [${edge.guard}]` : ''}</option>)}
      </select>
    </label>
    <p id={helpId}>Highlight one arrow with a thicker line. All nodes, flows and guards stay visible. Selection inspects the authored model; it does not execute a request.</p>
    <div className="activity-selection" aria-live="polite">{selected ? <EdgeText edge={selected} nodes={nodes} /> : <p>Showing all {model.edges.length} control flows. Follow one guarded alternative at each decision; the merge does not wait for the other alternatives.</p>}</div>
    <DiagramViewer title={model.title} headingLevel={3} width={model.width} transcript={transcript} legend={<>
      <p>Initial: solid circle. Action: rounded rectangle. Decision and merge: empty diamonds with different incoming/outgoing connectivity. A solid open arrow gives control direction; [condition] guards its edge.</p>
      <p>Activity final: bullseye, ending this entire activity. A flow final would be a circle with X ending only one flow. Fork and join bars describe concurrent control flows and synchronization; this sequential workflow has none.</p>
      <p>The text explanation retains all nodes, edges, guards and source paths at normal size. Read Java for the actual state changes; console formatting is outside the activity.</p>
    </>}><Canvas model={model} selected={selected?.id} /></DiagramViewer>
  </section>;
}
