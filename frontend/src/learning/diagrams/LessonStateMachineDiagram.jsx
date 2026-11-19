import { useId, useState } from 'react';
import DiagramViewer from '../../components/DiagramViewer';
import { validateStateMachineModel } from './stateMachineModel';
import './LessonStateMachineDiagram.css';

function TransitionText({ edge, nodes }) {
  return <>
    <strong>{nodes.get(edge.from).label} → {nodes.get(edge.to).label}: {edge.kind}</strong>
    <p>Event: {edge.event || (edge.kind === 'completion' ? 'implicit completion event' : 'none (initial)')}; guard: {edge.guard || 'none'}; effect: {edge.effect || 'none'}.</p>
    <p>{edge.description}</p><p>Source: <code>{edge.source}</code></p>
  </>;
}

function Label({ edge, selected }) {
  if (!edge.labelLines.length) return null;
  const { x, y } = edge.labelPosition;
  // Geometry only: reserve a background around each authored line of text.
  const width = Math.max(...edge.labelLines.map(line => line.length)) * 8.6 + 20;
  return <g className={`state-machine-label${selected ? ' state-machine-selected-label' : ''}`}>
    <rect x={x - width / 2} y={y - 20} width={width} height={edge.labelLines.length * 23 + 8} rx={4} />
    <text x={x} y={y} textAnchor="middle">{edge.labelLines.map((line, index) => <tspan key={line} x={x} dy={index ? 23 : 0}>{line}</tspan>)}</text>
  </g>;
}

// IDs belong to each rendered SVG, including independent inline/fullscreen mounts.
function Canvas({ model, selected }) {
  const prefix = `state-machine-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <svg className="lesson-state-machine-canvas" width={model.width} height={model.height}
    viewBox={`0 0 ${model.width} ${model.height}`} aria-hidden="true" focusable="false">
    <defs><marker id={`${prefix}-arrow`} viewBox="0 0 12 12" refX={11} refY={6} markerWidth={10} markerHeight={10} orient="auto" markerUnits="userSpaceOnUse">
      <path d="M1 1 L11 6 L1 11" fill="none" stroke="currentColor" strokeWidth={2} />
    </marker></defs>
    {model.transitions.filter(edge => edge.kind !== 'internal').map(edge => <g key={edge.id}
      data-transition={edge.id} data-kind={edge.kind} data-from={edge.from} data-to={edge.to} data-selected={selected?.id === edge.id}>
      <polyline className={`state-machine-arrow${selected?.id === edge.id ? ' state-machine-selected-arrow' : ''}`}
        points={edge.points.map(point => point.join(',')).join(' ')} fill="none" markerEnd={`url(#${prefix}-arrow)`} />
    </g>)}
    {model.nodes.map(node => <g key={node.id} data-node={node.id} data-node-kind={node.kind}>
      {node.kind === 'state' ? <>
        <rect className="state-machine-state" x={node.x} y={node.y} width={node.width} height={node.height} rx={18} />
        <text className="state-machine-state-title" x={node.x + node.width / 2} y={node.y + 29} textAnchor="middle">{node.label}</text>
        {node.lines?.length > 0 && <>
          <path className="state-machine-compartment" d={`M${node.x} ${node.y + 44} H${node.x + node.width}`} />
          {node.lines.map((line, index) => <text key={line} x={node.x + 16} y={node.y + 72 + index * 24}>{line}</text>)}
        </>}
      </> : <>
        <circle className={node.kind === 'initial' ? 'state-machine-initial' : 'state-machine-final-ring'} cx={node.x} cy={node.y} r={node.radius} />
        {node.kind === 'final' && <><circle className="state-machine-final-dot" cx={node.x} cy={node.y} r={10} />
          <text x={node.x} y={node.y + 47} textAnchor="middle">{node.label}</text></>}
      </>}
    </g>)}
    {model.transitions.map(edge => <g key={edge.id} {...(edge.kind === 'internal' ? {
      'data-transition': edge.id, 'data-kind': edge.kind, 'data-from': edge.from, 'data-to': edge.to, 'data-selected': selected?.id === edge.id,
    } : {})}><Label edge={edge} selected={selected?.id === edge.id} /></g>)}
  </svg>;
}

export default function LessonStateMachineDiagram({ model }) {
  const nodes = validateStateMachineModel(model);
  const titleId = useId(), selectId = useId(), helpId = useId();
  const [view, setView] = useState({ model, selected: null });
  if (view.model !== model) setView({ model, selected: null });
  const selected = view.model === model && model.transitions.includes(view.selected) ? view.selected : null;
  const transcript = <>
    <h4>All states and vertices</h4>
    <ul>{model.nodes.map(node => <li key={node.id}><strong>{node.label} ({node.kind})</strong>
      <p>{node.description}</p>{node.lines?.map(line => <p key={line}><code>{line}</code></p>)}
      <p>Source: <code>{node.source}</code></p></li>)}</ul>
    <h4>Every transition, including internal behavior</h4>
    <ol>{model.transitions.map(edge => <li key={edge.id}><TransitionText edge={edge} nodes={nodes} /></li>)}</ol>
    <h4>Notation, guard definitions and limits</h4><ul>{model.definitions.map(definition => <li key={definition}>{definition}</li>)}</ul>
  </>;
  return <section className="lesson-state-machine" aria-labelledby={titleId}>
    <h2 id={titleId}>{model.title}</h2><p>{model.summary}</p>
    <label className="lesson-state-machine-selector" htmlFor={selectId}>State machine transition
      <select id={selectId} aria-describedby={helpId} value={selected?.id || 'all'} onChange={event => setView({ model,
        selected: model.transitions.find(edge => edge.id === event.target.value) || null,
      })}>
        <option value="all">All transitions</option>
        {model.transitions.map(edge => <option key={edge.id} value={edge.id}>{edge.id}: {nodes.get(edge.from).label} → {nodes.get(edge.to).label}</option>)}
      </select>
    </label>
    <p id={helpId}>Selection highlights one transition. Every node, arrow, label and endpoint stays visible. The complete text explanation is independent of selection and readable without zooming.</p>
    <div className="lesson-state-machine-selection" aria-live="polite">{selected
      ? <TransitionText edge={selected} nodes={nodes} />
      : <p>Showing all {model.transitions.length} transitions. This is one domain object’s lifecycle; selecting a line does not run Java.</p>}</div>
    <DiagramViewer title={model.title} headingLevel={3} width={model.width} transcript={transcript} legend={<>
      <p>Rounded rectangles are states. The solid initial circle points to DRAFT. A bullseye is the final state of this single region; its completion ends this lifecycle, while the Java object remains readable.</p>
      <p>Arrows point source → target. Labels use event [guard] / effect. The renew loop is external: exit, effect, entry. inspect is internal text inside HELD: no exit or entry. HELD’s entry/exit effects are shown separately.</p>
      <p>Initial and completion arrows have no trigger label. Fixed logical minutes are explicit Java inputs; expiry is a command, not a timer. All guard definitions and source paths appear in the text explanation.</p>
    </>}><Canvas model={model} selected={selected} /></DiagramViewer>
  </section>;
}
